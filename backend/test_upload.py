import requests

# Change this if your backend runs on a different port
URL = "http://127.0.0.1:8000/process"

# File you want to upload
file_path = r"C:\Users\PAVIYA R\OneDrive\Desktop\AI&ML\1.2 introduction to machine learning.docx"


# Language to use
language = "English"

# Prepare the request
with open(file_path, "rb") as f:
    files = {"file": (file_path, f)}
    data = {"language": language}
    response = requests.post(URL, files=files, data=data)

# Print the response
print("Status Code:", response.status_code)
print("Response JSON:", response.json())
