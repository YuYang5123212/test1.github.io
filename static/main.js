// static/main.js
document.addEventListener('DOMContentLoaded', function() {
    const fileForm = document.querySelector('form');
    const fileList = document.getElementById('file-list');

    // 加载已上传的文件列表
    loadFileList();

    fileForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const files = fileForm.querySelector('input[type=file]').files;

        for (let i = 0; i < files.length; i++) {
            const formData = new FormData();
            formData.append('file', files[i]);
            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                addFileToList(data.filename);
            });
        }
    });

    function addFileToList(filename) {
        const li = document.createElement('li');
        const link = document.createElement('a');
        const deleteBtn = document.createElement('button');

        link.href = `/download/${filename}`;
        link.textContent = filename;
        link.className = 'file-link';
        deleteBtn.textContent = '删除';
        deleteBtn.addEventListener('click', () => {
            deleteFile(filename);
            li.remove();
        });

        li.appendChild(link);
        li.appendChild(deleteBtn);
        fileList.appendChild(li);
    }

    function loadFileList() {
        fetch('/list')
        .then(response => response.json())
        .then(data => {
            data.files.forEach(file => {
                addFileToList(file);
            });
        });
    }

    function deleteFile(filename) {
        fetch(`/delete/${filename}`, {
            method: 'DELETE'
        });
    }
});
