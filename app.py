from flask import Flask, request, jsonify, send_from_directory
import os

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    if file:
        filename = file.filename
        file.save(os.path.join(UPLOAD_FOLDER, filename))
        return jsonify({'filename': filename})

@app.route('/list', methods=['GET'])
def list_files():
    files = [f for f in os.listdir(UPLOAD_FOLDER) if os.path.isfile(os.path.join(UPLOAD_FOLDER, f))]
    return jsonify({'files': files})

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/delete/<filename>', methods=['DELETE'])
def delete_file(filename):
    os.remove(os.path.join(UPLOAD_FOLDER, filename))
    return '', 204

if __name__ == '__main__':
    app.run(debug=True)
