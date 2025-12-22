// 全局状态
let CONFIG = null;

// 初始化
async function init() {
    try {
        const res = await fetch('assets/data/config.json');
        CONFIG = await res.json();
        setupRenderer();
        router(); // 数据加载完毕后启动路由
    } catch (e) {
        console.error('配置加载失败:', e);
        document.getElementById('view').innerHTML = '无法加载站点配置，请检查 config.json';
    }
}

// 配置 Marked 渲染器
function setupRenderer() {
    const renderer = new marked.Renderer();

    renderer.image = function (href, title, text) {
        let src = href;

        // 修正路径逻辑：
        // 假设 Markdown 里写的是 "image/xxx.png" 或 "posts/image/xxx.png"
        // 统一提取文件名，并指向根目录的 image/ 文件夹
        if (src.includes('image/')) {
            const fileName = src.split('/').pop();
            src = 'image/' + fileName; // 指向根目录的 image 文件夹
        }

        const isVideo = /\.(mp4|webm|mov|MP4)$/i.test(src);
        if (isVideo) {
            return `<video controls playsinline preload="metadata">
                        <source src="${encodeURI(src)}" type="video/mp4">
                        您的浏览器不支持视频播放。
                    </video>`;
        }
        return `<img src="${encodeURI(src)}" alt="${text || ''}" title="${title || ''}">`;
    };
    marked.setOptions({ renderer, breaks: true });
}

// 路由系统
const router = async () => {
    if (!CONFIG) return; // 等待配置加载

    const hash = window.location.hash || '#/';
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    if (hash === '#/') {
        document.getElementById('nav-home').classList.add('active');
        renderHome();
    } else if (hash === '#/blog') {
        document.getElementById('nav-blog').classList.add('active');
        renderBlogList();
    } else if (hash === '#/projects') {
        document.getElementById('nav-projects').classList.add('active');
        renderProjectList();
    } else if (hash.startsWith('#/post/')) {
        const postId = hash.replace('#/post/', '');
        renderPostDetail(postId);
    }
};

// 渲染视图函数
function renderHome() {
    const p = CONFIG.profile;
    document.getElementById('view').innerHTML = `
        <div class="home-section">
            <h1 class="home-title">${p.title}</h1>
            <p class="home-bio">${p.bio}</p>
            <div class="info-grid">
                <div class="info-block">
                    <h3>Tech Stacks</h3>
                    <ul class="info-list">
                        <li>HarmonyOS / ArkTS</li>
                        <li>Embedded C / Arduino</li>
                        <li>Three.js / Web Graphics</li>
                        <li>STM32 Development</li>
                    </ul>
                </div>
                <div class="info-block">
                    <h3>Interests</h3>
                    <ul class="info-list">
                        <li>物联网交互设计</li>
                        <li>工业美学</li>
                        <li>摄影与影像记录</li>
                        <li>极简主义生活</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

function renderBlogList() {
    const items = CONFIG.blog.map(p => `
        <a href="#/post/${p.id}" class="item-card">
            <div class="item-meta">${p.date}</div>
            <div class="item-title">${p.title}</div>
        </a>
    `).join('');
    document.getElementById('view').innerHTML = `<h1 class="list-header">Notes.</h1>` + items;
}

function renderProjectList() {
    const items = CONFIG.projects.map(p => `
        <a href="${p.link}" class="item-card" ${p.link.startsWith('http') ? 'target="_blank"' : ''}>
            <div class="item-meta">${p.meta}</div>
            <div class="item-title">${p.title}</div>
        </a>
    `).join('');
    document.getElementById('view').innerHTML = `<h1 class="list-header">Works.</h1>` + items;
}

async function renderPostDetail(id) {
    const view = document.getElementById('view');
    const post = CONFIG.blog.find(p => p.id === id);
    if (!post) {
        view.innerHTML = '<p>文章不存在</p>';
        return;
    }

    view.innerHTML = `<p style="padding:100px 0; color:#999; text-align:center;">读取中...</p>`;

    try {
        const encodedPath = encodeURI(post.file);
        const res = await fetch(encodedPath);
        if (!res.ok) throw new Error('404');
        const md = await res.text();

        view.innerHTML = `
            <div class="article-wrap">
                <a href="#/blog" style="text-decoration:none; color:var(--text-sec); font-size:0.9rem;">← 返回列表</a>
                <h1 class="article-title">${post.title}</h1>
                <div class="article-info">Published on ${post.date} / Written by ${CONFIG.profile.name}</div>
                <div id="md-content">${marked.parse(md)}</div>
            </div>
        `;
        Prism.highlightAll();
    } catch (e) {
        console.error(e); // 在控制台打印详细错误
        view.innerHTML = `<div style="padding:100px 0; text-align:center;">
        文章加载失败。<br>
        错误详情: ${e.message}<br>  <!-- 让它直接把错误显示在屏幕上 -->
        路径: <code>${post.file}</code>
    </div>`;
    }
}

// 监听器
window.onscroll = () => {
    const btn = document.getElementById('btn-top');
    if (btn) btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
};
window.addEventListener('hashchange', router);
window.addEventListener('load', init);