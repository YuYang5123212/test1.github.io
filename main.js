document.getElementById('createIdeaBtn').addEventListener('click', function() {
    document.getElementById('inputArea').style.display = 'block';
});

document.getElementById('saveIdeaBtn').addEventListener('click', function() {
    var title = document.getElementById('ideaTitle').value;
    var content = document.getElementById('ideaContent').value;
    if (title && content) {
        var listItem = document.createElement('div');
        listItem.className = 'list-item';
        listItem.innerHTML = `
            <a href="#" onclick="event.preventDefault(); viewIdea('${content}')">${title}</a>
            <button class="btn delete-btn" onclick="deleteIdea(this)">删除</button>
        `;
        document.getElementById('ideaList').appendChild(listItem);
        document.getElementById('inputArea').style.display = 'none';
        document.getElementById('ideaTitle').value = '';
        document.getElementById('ideaContent').value = '';
    }
});

function viewIdea(content) {
    alert('文档内容：\n' + content);
}

function deleteIdea(buttonElement) {
    var listItem = buttonElement.parentElement;
    listItem.parentNode.removeChild(listItem);
}
