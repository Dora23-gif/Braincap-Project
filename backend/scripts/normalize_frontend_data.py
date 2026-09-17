import re
import os

repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
print(f"Repo root: {repo_root}")

files_to_update = [
    os.path.join(repo_root, "src", "data", "mockDataset100.ts"),
    os.path.join(repo_root, "src", "data", "initialEnterpriseData.ts"),
]

for file_path in files_to_update:
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content

    # Replace EIS/2026/0101 .. EIS/2026/0160 with EIS/2026/0001 .. EIS/2026/0060
    for num in range(1, 61):
        old_id = f"EIS/2026/{num + 100:04d}"
        new_id = f"EIS/2026/{num:04d}"
        content = content.replace(old_id, new_id)

    # Also check EIS/2026/0161 -> EIS/2026/0061
    content = content.replace("EIS/2026/0161", "EIS/2026/0061")

    if content != original_content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Successfully updated: {file_path}")
    else:
        print(f"No changes needed for: {file_path}")

print("Frontend dataset normalization complete!")
