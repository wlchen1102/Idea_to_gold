// 简单的前端数据与交互逻辑，实现 FR-101 信息流页面

// 模拟数据：为保证文件简洁，列出若干条示例，会在滚动时循环使用
const seedIdeas = [
  {
    id: 1,
    author: { name: "张设计师", role: "设计师", avatar: "Z" },
    createdAt: Date.now() - 2 * 60 * 60 * 1000,
    title: "智能家居控制系统UI设计",
    description:
      "基于物联网技术的智能家居控制系统设计，包含灯光、温度、安全防护等交互设计方案，采用卡片化布局提升操作效率。",
    terminals: ["web", "miniapp", "ios"],
    upvote_count: 1200,
    comment_count: 88,
    bounty_amount: 0,
    status: "pending",
  },
  {
    id: 2,
    author: { name: "李产品", role: "产品经理", avatar: "李" },
    createdAt: Date.now() - 4 * 60 * 60 * 1000,
    title: "在线教育平台交互优化",
    description:
      "针对K12在线教育平台的用户体验优化方案，包括课表、作业、师生互动等核心流程的可用性提升与视觉统一。",
    terminals: ["web", "android"],
    upvote_count: 856,
    comment_count: 42,
    bounty_amount: 0,
    status: "developing",
  },
  {
    id: 3,
    author: { name: "王开发", role: "后端开发", avatar: "王" },
    createdAt: Date.now() - 6 * 60 * 60 * 1000,
    title: "区块链钱包应用设计",
    description:
      "去中心化数字钱包应用的完整设计方案，包含资产管理、交易记录、DeFi功能模块，注重安全与易用性。",
    terminals: ["ios", "android"],
    upvote_count: 2100,
    comment_count: 156,
    bounty_amount: 0,
    status: "pending",
  },
  {
    id: 4,
    author: { name: "陈UI", role: "UI设计师", avatar: "陈" },
    createdAt: Date.now() - 8 * 60 * 60 * 1000,
    title: "医疗健康管理系统",
    description:
      "面向医院和患者的健康管理平台设计，包含预约、挂号、病历查看、健康数据监控等功能，符合医疗行业规范。",
    terminals: ["web", "miniapp"],
    upvote_count: 743,
    comment_count: 67,
    bounty_amount: 0,
    status: "pending",
  },
  {
    id: 5,
    author: { name: "刘创意", role: "产品策划", avatar: "刘" },
    createdAt: Date.now() - 10 * 60 * 60 * 1000,
    title: "社区电商平台设计",
    description:
      "结合社交电商和即时零售的新型平台设计，通过社交分享、直播带货、积分奖励等要素，打造新消费体验。",
    terminals: ["ios", "android"],
    upvote_count: 1800,
    comment_count: 203,
    bounty_amount: 0,
    status: "developing",
  },
  {
    id: 6,
    author: { name: "周视觉", role: "视觉设计", avatar: "周" },
    createdAt: Date.now() - 12 * 60 * 60 * 1000,
    title: "AR购物体验应用",
    description:
      "基于增强现实技术的购物应用设计，用户可以通过AR试穿或预览商品，提供沉浸式购物体验和个性化推荐。",
    terminals: ["ios", "android"],
    upvote_count: 967,
    comment_count: 91,
    bounty_amount: 0,
    status: "pending",
  },
];

// 运行时状态
const state = {
  sort: "hot", // hot | new | bounty
  terminals: new Set(["web", "ios", "android", "miniapp"]),
  status: "all", // all | pending | developing
  page: 1,
  pageSize: 6,
  items: [],
  loading: false,
};

// DOM 引用
const ideaListEl = document.getElementById("ideaList");
const loadingEl = document.getElementById("loading");

// 初始化
window.addEventListener("DOMContentLoaded", () => {
  bindToolbar();
  applyStateAndRender(true);
});

function bindToolbar(){
  // 发布按钮
  const publishBtn = document.getElementById("publishBtn");
  const fabPublish = document.getElementById("fabPublish");
  const publishHandler = () => alert("将跳转到【发布创意】（FR-102），当前为演示页面");
  publishBtn.addEventListener("click", publishHandler);
  fabPublish.addEventListener("click", publishHandler);

  // Tabs
  document.querySelectorAll(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      state.sort = btn.dataset.sort;
      state.page = 1;
      applyStateAndRender(true);
    });
  });

  // 筛选面板
  const panel = document.getElementById("filterPanel");
  document.getElementById("filterToggle").addEventListener("click", ()=>{
    panel.classList.toggle("hidden");
    panel.setAttribute("aria-hidden", panel.classList.contains("hidden"));
  });

  document.getElementById("applyFilters").addEventListener("click", ()=>{
    const terminals = new Set();
    panel.querySelectorAll('input[name="terminal"]:checked').forEach(i=>terminals.add(i.value));
    const status = panel.querySelector('input[name="status"]:checked').value;
    state.terminals = terminals;
    state.status = status;
    state.page = 1;
    applyStateAndRender(true);
  });

  document.getElementById("resetFilters").addEventListener("click", ()=>{
    panel.querySelectorAll('input[name="terminal"]').forEach(i=>i.checked=true);
    panel.querySelector('input[name="status"][value="all"]').checked = true;
  });

  // 无限滚动
  window.addEventListener("scroll", handleScrollLoadMore);
}

function handleScrollLoadMore(){
  if(state.loading) return;
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 48;
  if(nearBottom){
    if(state.page * state.pageSize >= 48){ // 演示：最多加载 48 条
      return;
    }
    state.page += 1;
    applyStateAndRender(false);
  }
}

function applyStateAndRender(reset){
  state.loading = true;
  loadingEl.classList.remove("hidden");

  // 模拟异步加载
  setTimeout(()=>{
    const filtered = filterIdeas(seedIdeas, state.terminals, state.status);
    const expanded = repeatToLength(filtered, state.page * state.pageSize);
    const sorted = sortIdeas(expanded, state.sort);
    state.items = sorted.slice(0, state.page * state.pageSize);
    render(state.items, reset);
    state.loading = false;
    loadingEl.classList.add("hidden");
  }, 300);
}

function filterIdeas(list, terminalsSet, status){
  return list.filter(item => {
    const terminalMatch = item.terminals.some(t => terminalsSet.has(t));
    const statusMatch = status === "all" ? true : item.status === status;
    return terminalMatch && statusMatch;
  });
}

function sortIdeas(list, type){
  const copy = [...list];
  if(type === "hot"){
    return copy.sort((a,b)=> b.upvote_count - a.upvote_count);
  }
  if(type === "new"){
    return copy.sort((a,b)=> b.createdAt - a.createdAt);
  }
  if(type === "bounty"){
    return copy.sort((a,b)=> (b.bounty_amount||0) - (a.bounty_amount||0));
  }
  return copy;
}

function repeatToLength(list, length){
  const out = [];
  let id = 1000;
  while(out.length < length){
    list.forEach(x=>{
      if(out.length < length){
        out.push({...x, id: id++, createdAt: x.createdAt - out.length*300000, upvote_count: Math.max(1, x.upvote_count - (out.length%50))});
      }
    })
  }
  return out;
}

function render(items, reset){
  if(reset){
    ideaListEl.innerHTML = "";
    window.scrollTo({top:0, behavior:"smooth"});
  }
  const frag = document.createDocumentFragment();
  items.forEach((idea, idx)=>{
    // 避免重复添加：若已存在则跳过
    if(document.getElementById(`idea-${idea.id}`)) return;
    frag.appendChild(createCard(idea));
  });
  ideaListEl.appendChild(frag);
}

function createCard(idea){
  const card = document.createElement("article");
  card.className = "card";
  card.id = `idea-${idea.id}`;
  card.tabIndex = 0;
  card.addEventListener("click", ()=> alert("进入创意详情（FR-103）- 演示状态"));

  // 头部
  const header = document.createElement("div");
  header.className = "card-header";
  const avatar = document.createElement("div");
  avatar.className = "card-avatar";
  avatar.textContent = idea.author.avatar;
  const author = document.createElement("div");
  author.className = "card-author";
  const name = document.createElement("div"); name.className = "name"; name.textContent = `${idea.author.name}`;
  const meta = document.createElement("div"); meta.className = "meta"; meta.textContent = `${idea.author.role} · ${formatTimeAgo(idea.createdAt)}`;
  author.appendChild(name); author.appendChild(meta);
  header.appendChild(avatar); header.appendChild(author);

  // 标题与描述
  const title = document.createElement("div"); title.className = "card-title"; title.textContent = idea.title;
  const desc = document.createElement("div"); desc.className = "card-desc"; desc.textContent = idea.description;

  // 标签
  const tags = document.createElement("div"); tags.className = "tags";
  idea.terminals.forEach(t=>{
    const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = mapTerminal(t);
    tags.appendChild(tag);
  });

  // 底部
  const footer = document.createElement("div"); footer.className = "card-footer";
  const left = document.createElement("div"); left.className = "action-group";
  const support = document.createElement("button"); support.className = "btn-support"; support.type = "button"; support.innerHTML = fireIcon() + ` 我也要 (${formatNumber(idea.upvote_count)})`;
  support.addEventListener("click", (e)=>{ e.stopPropagation(); alert("+1 支持成功（演示）"); });
  left.appendChild(support);

  const right = document.createElement("div"); right.className = "meta-group";
  const cm = document.createElement("span"); cm.className = "meta"; cm.innerHTML = commentIcon() + ` ${idea.comment_count}`;
  const bn = document.createElement("span"); bn.className = "meta bounty"; if(idea.bounty_amount>0){ bn.innerHTML = coinIcon() + ` ${idea.bounty_amount}`; }
  right.appendChild(cm); if(idea.bounty_amount>0) right.appendChild(bn);

  footer.appendChild(left); footer.appendChild(right);

  card.appendChild(header);
  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(tags);
  card.appendChild(footer);

  return card;
}

// 工具函数
function formatTimeAgo(time){
  const diff = Date.now() - time;
  const h = Math.floor(diff / 3600000);
  if(h < 24) return `${h}小时前`;
  const d = Math.floor(h/24);
  return `${d}天前`;
}
function formatNumber(n){
  if(n >= 1000) return (n/1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}
function mapTerminal(t){
  return ({ web:"网页", ios:"iOS", android:"Android", miniapp:"小程序" })[t] || t;
}

// 简单图标（SVG）
function fireIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3c1.5 3-.5 4-1 5-1 2 1 2 1 2s1-1 2-3c1.5-3 .5-5-2-4Z" fill="#0b815a"/><path d="M6 14a6 6 0 1 0 12 0c0-2.5-1.5-4.5-3.5-6-1 2-2.5 3-2.5 3s-2-1-1-3C9 9 6 11.5 6 14Z" fill="#0b815a"/></svg>`;
}
function commentIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 5h16v10H7l-3 4V5Z" stroke="#95a5a6" stroke-width="1.5"/></svg>`;
}
function coinIcon(){
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="12" rx="8" ry="6" stroke="#A37700" stroke-width="1.5"/><path d="M4 12c0 3.3 3.6 6 8 6s8-2.7 8-6" stroke="#A37700"/></svg>`;
} 