// ---------------------------------------------------------
// 1. 全局变量
// ---------------------------------------------------------
let CONFIG = null;
let TOC_DATA = [];

// ---------------------------------------------------------
// 2. 初始化
// ---------------------------------------------------------
async function init() {
    try {
        const res = await fetch('assets/data/config.json');
        CONFIG = await res.json();
        setupRenderer();
        router();
    } catch (e) {
        console.error(e);
        document.getElementById('view').innerHTML = '配置加载失败';
    }
}

// ---------------------------------------------------------
// 3. 配置 Marked (收集标题)
// ---------------------------------------------------------
function setupRenderer() {
    const renderer = new marked.Renderer();

    renderer.heading = function (token, level) {
        const text = (typeof token === 'object') ? token.text : token;
        const depth = (typeof token === 'object') ? token.depth : level;
        const anchorId = `heading-${TOC_DATA.length}`;

        TOC_DATA.push({ anchor: anchorId, text: text, level: depth });

        return `<h${depth} id="${anchorId}">${text}</h${depth}>`;
    };

    renderer.image = function (token, title, text) {
        let src = (typeof token === 'object') ? token.href : token;
        const imgText = (typeof token === 'object') ? token.text : text;
        if (!src) return '';

        if (src.includes('image/')) src = 'image/' + src.split('/').pop();

        if (/\.(mp4|webm|mov)$/i.test(src)) {
            return `<video controls playsinline><source src="${encodeURI(src)}" type="video/mp4"></video>`;
        }
        return `<img src="${encodeURI(src)}" alt="${imgText || ''}">`;
    };

    marked.setOptions({ renderer, breaks: true });
}

// ---------------------------------------------------------
// 4. 路由系统 (关键修改：每次路由切换时清空目录)
// ---------------------------------------------------------
const router = async () => {
    if (!CONFIG) return;
    const hash = window.location.hash || '#/';

    // 【关键】每次切换页面，先清空全局目录容器，防止残留
    document.getElementById('global-toc').innerHTML = '';
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

// ---------------------------------------------------------
// 5. 渲染函数
// ---------------------------------------------------------
function renderHome() {
    const p = CONFIG.profile;
    document.getElementById('view').innerHTML = `
        <div class="home-section">
            <h1 class="home-title">${p.title}</h1>
            <p class="home-bio">${p.bio}</p>
            <!-- 你的信息列表保持不变 -->
            <div class="info-grid">
                <div class="info-block"><h3>Tech Stacks</h3><ul class="info-list"><li>HarmonyOS / ArkTS</li><li>Embedded C / Arduino</li></ul></div>
                <div class="info-block"><h3>Interests</h3><ul class="info-list"><li>物联网交互设计</li><li>极简主义生活</li></ul></div>
            </div>
        </div>`;
}

function renderBlogList() {
    const items = CONFIG.blog.map(p => `<a href="#/post/${p.id}" class="item-card"><div class="item-meta">${p.date}</div><div class="item-title">${p.title}</div></a>`).join('');
    document.getElementById('view').innerHTML = `<h1 class="list-header">Notes.</h1>` + items;
}

function renderProjectList() {
    const items = CONFIG.projects.map(p => `<a href="${p.link}" class="item-card"><div class="item-meta">${p.meta}</div><div class="item-title">${p.title}</div></a>`).join('');
    document.getElementById('view').innerHTML = `<h1 class="list-header">Works.</h1>` + items;
}

// --- 核心修改：文章详情与目录分离渲染 ---
async function renderPostDetail(id) {
    const view = document.getElementById('view');
    const tocContainer = document.getElementById('global-toc'); // 获取外部容器
    const post = CONFIG.blog.find(p => p.id === id);

    if (!post) { view.innerHTML = '文章不存在'; return; }

    view.innerHTML = `<p style="padding:100px 0; text-align:center;">读取中...</p>`;
    TOC_DATA = []; // 重置数据

    try {
        const res = await fetch(encodeURI(post.file));
        if (!res.ok) throw new Error('404');
        const md = await res.text();
        const htmlContent = marked.parse(md);

        // 1. 渲染文章本体 (在 #view 中)
        view.innerHTML = `
            <div class="article-wrap">
                <a href="#/blog" style="text-decoration:none; color:#999;">← 返回列表</a>
                <h1 class="article-title">${post.title}</h1>
                <div class="article-info">${post.date}</div>
                <div id="md-content">${htmlContent}</div>
            </div>
        `;
        Prism.highlightAll();

        // 2. 渲染悬浮目录 (在 #global-toc 中) - 彻底脱离 #view 的动画影响
        if (TOC_DATA.length > 0) {
            const listItems = TOC_DATA.map(item => `
                <li class="toc-level-${item.level}">
                    <a href="#" onclick="scrollToAnchor('${item.anchor}', event)" class="toc-link">${item.text}</a>
                </li>
            `).join('');

            tocContainer.innerHTML = `
                <div id="toc-btn" class="toc-toggle-btn" onclick="toggleToc(event)">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                </div>
                <div id="toc-sidebar" class="toc-sidebar">
                    <div class="toc-header">
                        <span>Directory</span>
                        <span style="cursor:pointer; float:right;" onclick="toggleToc(event)">×</span> <!-- 增加关闭按钮 -->
                    </div>
                    <ul class="toc-list">${listItems}</ul>
                </div>
            `;
        }

    } catch (e) {
        view.innerHTML = '加载失败';
    }
}

// ---------------------------------------------------------
// 6. 交互逻辑 (修复点击事件)
// ---------------------------------------------------------
window.toggleToc = function (e) {
    if (e) e.stopPropagation(); // 阻止冒泡，防止立即触发 global click
    const sidebar = document.getElementById('toc-sidebar');
    if (sidebar) sidebar.classList.toggle('active');
}

window.scrollToAnchor = function (id, e) {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
        const top = element.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: top, behavior: "smooth" });
        // 手机端跳转后自动关闭
        if (window.innerWidth < 768) toggleToc();
    }
}

// 点击空白处关闭目录
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('toc-sidebar');
    const btn = document.getElementById('toc-btn');
    // 如果点击的不是侧边栏内部，也不是按钮，则关闭
    if (sidebar && sidebar.classList.contains('active')) {
        if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    }
});

window.onscroll = () => {
    const btn = document.getElementById('btn-top');
    if (btn) btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
};

window.addEventListener('hashchange', router);
window.addEventListener('load', init);