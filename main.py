import uvicorn
from fastapi import FastAPI, WebSocket
import json
import sys
import io
import asyncio
import ast
from code import InteractiveConsole

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "FastAPI is running on Fly.io"}

def wrap_last_expr_in_print(source: str):
    """
    If the last statement in the source code is an expression and
    is not already a print() call, wrap it with a print() call so its result is printed.
    """
    try:
        tree = ast.parse(source, mode='exec')
    except SyntaxError:
        # Return original compiled code if parsing fails.
        return compile(source, filename="<input>", mode="exec")
    
    if tree.body and isinstance(tree.body[-1], ast.Expr):
        last_expr = tree.body[-1]
        # If the last expression is already a call to print, leave it.
        if (isinstance(last_expr.value, ast.Call) and
            isinstance(last_expr.value.func, ast.Name) and
            last_expr.value.func.id == 'print'):
            return compile(source, filename="<input>", mode="exec")
        
        # Wrap the last expression with a print() call.
        print_call = ast.Expr(
            value=ast.Call(
                func=ast.Name(id='print', ctx=ast.Load()),
                args=[last_expr.value],
                keywords=[]
            )
        )
        tree.body[-1] = print_call
        ast.fix_missing_locations(tree)
        return compile(tree, filename="<ast>", mode="exec")
    else:
        return compile(source, filename="<input>", mode="exec")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    console = InteractiveConsole()

    input_future = None  # Shared input state

    async def websocket_input(prompt: str) -> str:
        nonlocal input_future
        input_future = asyncio.get_event_loop().create_future()

        await websocket.send_text(json.dumps({
            "action": "input_request",
            "prompt": prompt
        }))

        return await input_future

    def patched_input(prompt=""):
        return asyncio.get_event_loop().run_until_complete(websocket_input(prompt))

    while True:
        try:
            data = await websocket.receive_text()
            request = json.loads(data)
            action = request.get("action")

            # Handle input responses early
            if action == "input_response" and input_future:
                input_future.set_result(request.get("value", ""))
                continue

            # Redirect stdout and stderr
            old_stdout = sys.stdout
            old_stderr = sys.stderr
            sys.stdout = io.StringIO()
            sys.stderr = io.StringIO()

            try:
                if action == "run":
                    code = request.get("code", "")

                    try:
                        # Test compilation of original code (for syntax errors)
                        compile(code, "<input>", "exec")
                    except SyntaxError as e:
                        print(f"❌ SyntaxError: {e.msg} on line {e.lineno}")
                    else:
                        # Patch input as an async function
                        async def websocket_input(prompt: str) -> str:
                            nonlocal input_future
                            input_future = asyncio.get_event_loop().create_future()
                            await websocket.send_text(json.dumps({
                                "action": "input_request",
                                "prompt": prompt
                            }))
                            return await input_future

                        async def patched_input(prompt=""):
                            return await websocket_input(prompt)

                        # Override input() in the user's local namespace.
                        console.locals["input"] = patched_input

                        async def run_user_code():
                            try:
                                # Transform the code to automatically print the last expression
                                code_obj = wrap_last_expr_in_print(code)
                                exec(code_obj, console.locals)
                                # Only call main() if it's defined.
                                main_fn = console.locals.get("main")
                                if callable(main_fn):
                                    if asyncio.iscoroutinefunction(main_fn):
                                        await main_fn()
                                    else:
                                        main_fn()
                            except Exception as e:
                                print(f"⚠️ Runtime error: {type(e).__name__}: {str(e)}")

                        await run_user_code()

                elif action == "compile":
                    code = request.get("code", "")
                    try:
                        compile(code, "<input>", "exec")
                        exec(code, {})  # Optional runtime check
                        print("✅ Code compiles and passes initial checks.")
                    except SyntaxError as e:
                        print(f"❌ SyntaxError: {e.msg} on line {e.lineno}")
                    except Exception as e:
                        print(f"❌ Runtime Error during setup: {type(e).__name__}: {str(e)}")

                elif action == "test":
                    import types
                    import unittest
                    import traceback

                    code_under_test = request.get("code", "")
                    test_code = request.get("tests", "")
                    test_globals = {}

                    try:
                        if not code_under_test.strip():
                            raise ValueError("No code provided to test.")
                        if not test_code.strip():
                            raise ValueError("No test cases provided.")

                        exec(code_under_test, test_globals)
                        test_globals["unittest"] = unittest
                        exec(test_code, test_globals)

                        test_module = types.ModuleType("__test_module__")
                        test_module.__dict__.update(test_globals)

                        loader = unittest.TestLoader()
                        suite = loader.loadTestsFromModule(test_module)

                        runner = unittest.TextTestRunner(stream=sys.stdout, verbosity=2)
                        runner.run(suite)

                    except Exception:
                        traceback.print_exc()

                else:
                    print(f"Unsupported action: {action}")

                output = sys.stdout.getvalue() + sys.stderr.getvalue()
            finally:
                sys.stdout = old_stdout
                sys.stderr = old_stderr

            await websocket.send_text(">> " + output)

        except Exception as e:
            await websocket.send_text(f"Error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
