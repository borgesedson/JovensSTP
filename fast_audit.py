import os
import re

hooks = ['useMemo', 'useCallback', 'useRef', 'useContext', 'useReducer', 'useEffect', 'useState']
src_dir = 'src'

print("--- AUDIT START ---")

found_issues = False

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                try:
                    content = f.read()
                except:
                    continue
                
                # Check for OpenAI
                if 'openai' in content.lower():
                    print(f"[OPENAI] {path}")
                    found_issues = True
                
                # Check for Hooks
                missing_hooks = []
                for hook in hooks:
                    if re.search(rf'\b{hook}\(', content):
                        # Simple check for import
                        if not re.search(rf"\b{hook}\b", content.split('export')[0] if 'export' in content else content):
                            # Maybe imported as React.hook?
                            if not re.search(rf"React\.{hook}\(", content):
                                missing_hooks.append(hook)
                
                if missing_hooks:
                    print(f"[HOOKS] {path}: missing {', '.join(missing_hooks)}")
                    found_issues = True

if not found_issues:
    print("No issues found.")

print("--- AUDIT END ---")
