// 全局状态
let CONFIG = null;
let TOC_DATA = []; // 用于存储当前文章的目录结构

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
// 配置 Marked 渲染器
function setupRenderer() {
    const renderer = new marked.Renderer();

    // --- 新增：处理标题，生成目录数据 ---
    renderer.heading = function (token, level, raw) {
        // 兼容处理：获取纯文本标题
        // Marked 新版中 token 是对象，旧版中 token 是 text 字符串
        const text = (typeof token === 'object' && token !== null) ? token.text : token;
        // 获取层级 (新版在 token.depth)
        const depth = (typeof token === 'object' && token !== null) ? token.depth : level;

        // 生成唯一的 ID (例如: heading-0, heading-1)
        const anchorId = `heading-${TOC_DATA.length}`;

        // 将数据推入全局数组
        TOC_DATA.push({
            anchor: anchorId,
            text: text,
            level: depth
        });

        // 返回带 ID 的 HTML 标签
        return `<h${depth} id="${anchorId}">${text}</h${depth}>`;
    };

    // --- 原有：处理图片 (你之前修改过的代码) ---
    renderer.image = function (token, title, text) {
        let src = (typeof token === 'object' && token !== null) ? token.href : token;
        const imgTitle = (typeof token === 'object' && token !== null) ? token.title : title;
        const imgText = (typeof token === 'object' && token !== null) ? token.text : text;

        if (!src) return '';

        if (src.includes('image/')) {
            const fileName = src.split('/').pop();
            src = 'image/' + fileName;
        }

        const isVideo = /\.(mp4|webm|mov|MP4)$/i.test(src);
        if (isVideo) {
            return `<video controls playsinline preload="metadata">
                        <source src="${encodeURI(src)}" type="video/mp4">
                        您的浏览器不支持视频播放。
                    </video>`;
        }
        return `<img src="${encodeURI(src)}" alt="${imgText || ''}" title="${imgTitle || ''}">`;
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
        // 1. 重置目录数据
        TOC_DATA = [];

        const encodedPath = encodeURI(post.file);
        const res = await fetch(encodedPath);
        if (!res.ok) throw new Error('404');
        const md = await res.text();

        // 2. 解析 Markdown (此时会触发 renderer.heading 填充 TOC_DATA)
        const htmlContent = marked.parse(md);

        // 3. 生成目录 HTML
        let tocHtml = '';
        if (TOC_DATA.length > 0) {
            const listItems = TOC_DATA.map(item => `
                <li class="toc-level-${item.level}">
                    <a href="#" onclick="scrollToAnchor('${item.anchor}', event)" class="toc-link" title="${item.text}">
                        ${item.text}
                    </a>
                </li>
            `).join('');

            tocHtml = `
                <div id="toc-btn" class="toc-toggle-btn" onclick="toggleToc()">
                    <!-- 图标：列表 -->
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="#1a1a1a" stroke-width="2" fill="none">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                </div>
                <div id="toc-sidebar" class="toc-sidebar">
                    <div class="toc-header">Directory</div>
                    <ul class="toc-list">${listItems}</ul>
                </div>
            `;
        }

        // 4. 注入视图 (文章内容 + 目录组件)
        view.innerHTML = `
            <div class="article-wrap">
                <a href="#/blog" style="text-decoration:none; color:var(--text-sec); font-size:0.9rem;">← 返回列表</a>
                <h1 class="article-title">${post.title}</h1>
                <div class="article-info">Published on ${post.date} / Written by ${CONFIG.profile.name}</div>
                <div id="md-content">${htmlContent}</div>
            </div>
            ${tocHtml} <!-- 插入目录 -->
        `;
        Prism.highlightAll();

    } catch (e) {
        console.error(e);
        view.innerHTML = `<div style="padding:100px 0; text-align:center;">
            文章加载失败。<br>
            错误详情: ${e.message}<br>
            路径: <code>${post.file}</code>
        </div>`;
    }
}

// --- 辅助功能：控制目录显示与跳转 ---

// 切换侧边栏开关
window.toggleToc = function () {
    const sidebar = document.getElementById('toc-sidebar');
    sidebar.classList.toggle('active');
}

// 平滑跳转到对应标题
window.scrollToAnchor = function (id, event) {
    event.preventDefault(); // 阻止默认锚点跳转
    const element = document.getElementById(id);
    if (element) {
        // 计算偏移量，留出一点顶部空间
        const offset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });

        // 手机端跳转后自动收起侧边栏
        if (window.innerWidth < 768) {
            document.getElementById('toc-sidebar').classList.remove('active');
        }
    }
}

// 监听器
window.onscroll = () => {
    const btn = document.getElementById('btn-top');
    if (btn) btn.style.display = window.scrollY > 400 ? 'flex' : 'none';
};
window.addEventListener('hashchange', router);
window.addEventListener('load', init);