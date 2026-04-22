import os
import re

hooks = ['useMemo', 'useCallback', 'useRef', 'useContext', 'useReducer']
src_dir = 'src'

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                try:
                    content = f.read()
                except UnicodeDecodeError:
                    continue
                
                missing_hooks = []
                for hook in hooks:
                    # Check if hook is used but not as React.hook
                    if re.search(rf'\b{hook}\(', content):
                        # Check if hook is imported in curly braces from 'react'
                        # This regex is simple and might miss multi-line imports
                        import_match = re.search(rf"import\s+{{[^}}]*\b{hook}\b[^}}]*}}\s+from\s+['\"]react['\"]", content, re.MULTILINE)
                        # Check if imported as a named import in another way? Unlikely.
                        # Check if React.hook is used - if so, it's not a ReferenceError if React is imported
                        react_hook_match = re.search(rf"React\.{hook}\(", content)
                        
                        if not import_match and not react_hook_match:
                            missing_hooks.append(hook)
                
                if missing_hooks:
                    print(f"{path}: missing {', '.join(missing_hooks)}")
