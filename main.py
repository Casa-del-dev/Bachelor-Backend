import uvicorn
from fastapi import FastAPI, WebSocket
import json
import sys
import io
from code import InteractiveConsole

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "FastAPI is running on Fly.io"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    # Persistent interactive console for run commands
    console = InteractiveConsole()

    while True:
        try:
            data = await websocket.receive_text()
            request = json.loads(data)
            action = request.get("action")

            # Redirect stdout and stderr to capture all output
            old_stdout = sys.stdout
            old_stderr = sys.stderr
            sys.stdout = io.StringIO()
            sys.stderr = io.StringIO()

            try:
                if action == "run":
                    # REPL-style persistent execution
                    code = request.get("code", "")
                    try:
                        # Try evaluating expressions
                        code_obj = compile(code, "<input>", "eval")
                        result = eval(code_obj, console.locals)
                        if result is not None:
                            print(repr(result))
                    except SyntaxError:
                        # Not an expression? Execute as statements.
                        try:
                            exec(code, console.locals)
                        except Exception as e:
                            print(f"Error: {str(e)}")
                    except Exception as e:
                        print(f"Error: {str(e)}")

                elif action == "compile":
                    # Syntax check without execution.
                    code = request.get("code", "")
                    try:
                        compile(code, "<input>", "exec")
                        print("✅ Code compiles with no syntax errors.")
                    except SyntaxError as e:
                        print(f"❌ SyntaxError: {str(e)}")

                elif action == "test":
                    import types
                    import unittest
                    import traceback

                    code_under_test = request.get("code", "")
                    test_code = request.get("tests", "")

                    # Create a clean global context for testing.
                    test_globals = {}

                    try:
                        if not code_under_test.strip():
                            raise ValueError("No code provided to test.")
                        if not test_code.strip():
                            raise ValueError("No test cases provided.")

                        # Step 1: Execute the code to be tested.
                        exec(code_under_test, test_globals)

                        test_globals["unittest"] = unittest
                        # Step 2: Execute the test cases in the same context.
                        exec(test_code, test_globals)

                        # Step 3: Wrap the globals in a fake module for unittest.
                        test_module = types.ModuleType("__test_module__")
                        test_module.__dict__.update(test_globals)

                        loader = unittest.TestLoader()
                        suite = loader.loadTestsFromModule(test_module)

                        runner = unittest.TextTestRunner(stream=sys.stdout, verbosity=2)
                        runner.run(suite)

                    except Exception:
                        # Print full traceback for easier debugging.
                        traceback.print_exc()

                else:
                    print(f"Unsupported action: {action}")

                # Gather output from stdout and stderr.
                output = sys.stdout.getvalue() + sys.stderr.getvalue()
            finally:
                sys.stdout = old_stdout
                sys.stderr = old_stderr

            await websocket.send_text(">> " + output)
        except Exception as e:
            await websocket.send_text(f"Error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
