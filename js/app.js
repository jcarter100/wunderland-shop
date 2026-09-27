/* WUNDERLAND RECORDS — shop.wunderland.gg · vanilla JS storefront (cart in localStorage; checkout is a DEMO). */
(function(){
  const ROOT = document.body.dataset.root || "";
  const D = window.WL || {products:[],artists:[],releases:[]};
  const byId = Object.fromEntries(D.products.map(p=>[p.id,p]));
  const KEY = "wl_cart_v1";
  const money = n => "$" + n.toFixed(2);
  const esc = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  // ---------- cart
  const Cart = {
    get(){ try{ const c = JSON.parse(localStorage.getItem(KEY)||"{}"); return Object.fromEntries(Object.entries(c).filter(([k,v])=>byId[k]&&v>0)); }catch(e){ return {}; } },
    set(c){ localStorage.setItem(KEY, JSON.stringify(c)); render(); },
    add(id,q=1){ const c=this.get(); c[id]=Math.min(99,(c[id]||0)+q); this.set(c); },
    qty(id,q){ const c=this.get(); if(q<=0) delete c[id]; else c[id]=Math.min(99,q); this.set(c); },
    clear(){ localStorage.removeItem(KEY); render(); },
    lines(){ return Object.entries(this.get()).map(([id,q])=>({p:byId[id],q})); },
    count(){ return this.lines().reduce((a,l)=>a+l.q,0); },
    subtotal(){ return this.lines().reduce((a,l)=>a+l.p.price*l.q,0); },
    physical(){ return this.lines().some(l=>l.p.format!=="Digital"); }
  };
  window.WLCart = Cart;
  const SHIP_FREE = 75, SHIP = 6.00;
  const shipping = () => !Cart.physical() ? 0 : (Cart.subtotal() >= SHIP_FREE ? 0 : SHIP);

  function toast(msg){
    let t=document.querySelector(".toast"); if(!t){t=document.createElement("div");t.className="toast";t.setAttribute("role","status");document.body.appendChild(t);}
    t.innerHTML = msg + ` <a href="${ROOT}cart.html">VIEW CART →</a>`; t.classList.add("show");
    clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove("show"),2600);
  }

  document.addEventListener("click", e=>{
    const a = e.target.closest("[data-add]");
    if(a){ e.preventDefault(); const q = a.dataset.qtyFrom ? Math.max(1, parseInt(document.querySelector(a.dataset.qtyFrom).value)||1) : 1;
      Cart.add(a.dataset.add, q); const p=byId[a.dataset.add]; toast(`Added: ${esc(p.title)} · ${esc(p.format)}${q>1?" ×"+q:""}`); }
    const s = e.target.closest("[data-step]");
    if(s){ const inp=document.querySelector(s.dataset.target); inp.value=Math.max(1,Math.min(99,(parseInt(inp.value)||1)+parseInt(s.dataset.step))); }
    if(e.target.closest(".menu-toggle")){ document.querySelector(".nav").classList.toggle("open"); }
  });

  function render(){
    document.querySelectorAll("[data-cart-count]").forEach(el=>el.textContent=Cart.count());
    if(document.getElementById("cart-root")) renderCart();
    if(document.getElementById("checkout-root")) renderCheckoutSummary();
  }

  // ---------- product card (shared with the static HTML generator's markup)
  function card(p){
    const lim = p.limited ? `<span class="chip lim">Limited</span>` : `<span class="chip">${esc(p.format)}</span>`;
    const artistLink = p.artistSlug ? `<a class="artist" href="${ROOT}artists/${p.artistSlug}.html">${esc(p.artist)}</a>` : `<span class="artist">${esc(p.artist)}</span>`;
    return `<article class="card">
      <a class="img" href="${ROOT}products/${p.id}.html"><img loading="lazy" src="${ROOT}${p.image}" alt="${esc(p.name)} — product artwork" width="800" height="800"></a>
      <div class="body"><div class="fmt">${lim}<span class="micro muted" style="font-size:9px">${esc(p.releaseYear||"")}</span></div>
      ${artistLink}<h3><a href="${ROOT}products/${p.id}.html">${esc(p.title)}</a></h3><div class="var">${esc(p.variant)}</div>
      <div class="buy"><span class="price">${money(p.price)}</span><button class="btn sm dark" data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart">Add to cart</button></div></div></article>`;
  }
  window.WLCard = card;

  // ---------- shop page
  function initShop(){
    const root = document.getElementById("shop-root"); if(!root) return;
    const params = new URLSearchParams(location.search);
    const st = {format: params.get("format")||"All", artist: params.get("artist")||"All", q: params.get("q")||"", sort: params.get("sort")||"featured"};
    const FORMATS = ["All","Vinyl","CD","Cassette","Digital","Merch"];
    const artists = ["All", ...D.artists.map(a=>a.slug), "label"];
    const aname = s => s==="All"?"All artists": s==="label"?"Wunderland Records (label)": (D.artists.find(a=>a.slug===s)||{}).name;
    const fEl = document.getElementById("f-format"), aEl=document.getElementById("f-artist"), qEl=document.getElementById("f-q"), sEl=document.getElementById("f-sort");
    const out = document.getElementById("shop-grid"), cnt=document.getElementById("shop-count");
    qEl.value = st.q; sEl.value = st.sort;
    const match = (p, ign) => (ign==="format"||st.format==="All"||p.format===st.format) && (ign==="artist"||st.artist==="All"||(st.artist==="label"?!p.artistSlug:p.artistSlug===st.artist))
      && (!st.q || (p.name+" "+p.artist+" "+(p.releaseType||"")+" "+p.format).toLowerCase().includes(st.q.toLowerCase()));
    function draw(){
      fEl.innerHTML = FORMATS.map(f=>`<button class="opt ${st.format===f?"on":""}" data-f="${f}">${f==="All"?"All formats":f}<span>${D.products.filter(p=>(f==="All"||p.format===f)&&match(p,"format")).length}</span></button>`).join("");
      aEl.innerHTML = artists.map(s=>`<button class="opt ${st.artist===s?"on":""}" data-a="${s}">${esc(aname(s))}<span>${D.products.filter(p=>(s==="All"||(s==="label"?!p.artistSlug:p.artistSlug===s))&&match(p,"artist")).length}</span></button>`).join("");
      let list = D.products.filter(p=>match(p));
      const order = {Vinyl:0,CD:1,Cassette:2,Digital:3,Merch:4};
      if(st.sort==="price-asc") list.sort((a,b)=>a.price-b.price);
      else if(st.sort==="price-desc") list.sort((a,b)=>b.price-a.price);
      else if(st.sort==="newest") list.sort((a,b)=>(b.releaseDate||b.releaseYear||"0").localeCompare(a.releaseDate||a.releaseYear||"0"));
      else if(st.sort==="az") list.sort((a,b)=>a.title.localeCompare(b.title));
      else list.sort((a,b)=>(b.featured?1:0)-(a.featured?1:0) || (b.releaseDate||b.releaseYear||"0").localeCompare(a.releaseDate||a.releaseYear||"0") || order[a.format]-order[b.format]);
      cnt.textContent = `${list.length} item${list.length===1?"":"s"}`;
      out.innerHTML = list.length ? list.map(card).join("") : `<div class="empty" style="grid-column:1/-1">Nothing matches those filters.</div>`;
      document.getElementById("shop-title").innerHTML = st.format==="All" ? "The <em>Store</em>" : `${esc(st.format)}`;
      const u = new URLSearchParams(); if(st.format!=="All")u.set("format",st.format); if(st.artist!=="All")u.set("artist",st.artist); if(st.q)u.set("q",st.q); if(st.sort!=="featured")u.set("sort",st.sort);
      history.replaceState(null,"", location.pathname + (u.toString()?"?"+u:""));
    }
    fEl.addEventListener("click",e=>{const b=e.target.closest("[data-f]"); if(b){st.format=b.dataset.f; draw();}});
    aEl.addEventListener("click",e=>{const b=e.target.closest("[data-a]"); if(b){st.artist=b.dataset.a; draw();}});
    qEl.addEventListener("input",()=>{st.q=qEl.value.trim(); draw();});
    sEl.addEventListener("change",()=>{st.sort=sEl.value; draw();});
    draw();
  }

  // ---------- cart page
  function renderCart(){
    const root=document.getElementById("cart-root"); const lines=Cart.lines();
    if(!lines.length){ root.innerHTML=`<div class="empty"><p class="micro">Your cart is empty</p><p>Browse vinyl, CDs, cassettes, downloads and merch.</p><a class="btn dark" href="${ROOT}shop.html">Go to the store →</a></div>`; return; }
    const sub=Cart.subtotal(), ship=shipping();
    root.innerHTML = `<div class="cart-layout"><div><table class="cart-table"><thead><tr><th></th><th>Item</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead><tbody>
      ${lines.map(({p,q})=>`<tr><td><a href="${ROOT}products/${p.id}.html"><img src="${ROOT}${p.image}" alt=""></a></td>
      <td><div class="micro muted" style="font-size:9.5px">${esc(p.artist)}</div><a href="${ROOT}products/${p.id}.html" style="text-decoration:none"><b>${esc(p.title)}</b></a><div class="muted" style="font-size:13px">${esc(p.variant)}</div><button class="link-btn" data-rm="${p.id}">Remove</button></td>
      <td>${money(p.price)}</td>
      <td><div class="qty"><button data-q="${p.id}" data-d="-1" aria-label="Decrease">−</button><input value="${q}" data-qi="${p.id}" inputmode="numeric" aria-label="Quantity"><button data-q="${p.id}" data-d="1" aria-label="Increase">+</button></div></td>
      <td class="price" style="font-size:15px">${money(p.price*q)}</td></tr>`).join("")}</tbody></table>
      <p style="margin-top:18px"><button class="link-btn" id="clear-cart">Clear cart</button></p></div>
      <aside class="summary"><div class="micro muted">Order summary</div>
      <div class="row"><span>Subtotal (${Cart.count()} items)</span><b>${money(sub)}</b></div>
      <div class="row"><span>Shipping ${Cart.physical()?"(est.)":"— digital only"}</span><b>${ship?money(ship):"Free"}</b></div>
      ${Cart.physical() && sub<SHIP_FREE ? `<div class="note">Add ${money(SHIP_FREE-sub)} more for free shipping on physical orders.</div>`:""}
      <div class="row total"><span>Total</span><span>${money(sub+ship)}</span></div>
      <a class="btn dark" style="width:100%;margin-top:16px" href="${ROOT}checkout.html">Checkout →</a>
      <p class="muted" style="font-size:12px;margin:12px 0 0">Demo store — checkout is a mock-up and does not take payment.</p></aside></div>`;
    root.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>Cart.qty(b.dataset.rm,0));
    root.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>Cart.qty(b.dataset.q,(Cart.get()[b.dataset.q]||0)+parseInt(b.dataset.d)));
    root.querySelectorAll("[data-qi]").forEach(i=>i.onchange=()=>Cart.qty(i.dataset.qi,parseInt(i.value)||0));
    document.getElementById("clear-cart").onclick=()=>Cart.clear();
  }

  // ---------- checkout (mock)
  function renderCheckoutSummary(){
    const box=document.getElementById("checkout-summary"); if(!box) return; const lines=Cart.lines();
    const form=document.getElementById("checkout-form");
    if(!lines.length && !document.getElementById("checkout-root").dataset.done){ document.getElementById("checkout-root").innerHTML=`<div class="empty"><p class="micro">Nothing to check out</p><a class="btn dark" href="${ROOT}shop.html">Go to the store →</a></div>`; return; }
    const sub=Cart.subtotal(), ship=shipping();
    box.innerHTML = `<div class="micro muted">Your order</div>${lines.map(({p,q})=>`<div class="row"><span>${esc(p.title)} <span class="muted">· ${esc(p.format)} ×${q}</span></span><b>${money(p.price*q)}</b></div>`).join("")}
      <div class="row"><span>Shipping</span><b>${ship?money(ship):"Free"}</b></div><div class="row total"><span>Total</span><span>${money(sub+ship)}</span></div>`;
    const shipBlock=document.getElementById("ship-block"); if(shipBlock) shipBlock.style.display = Cart.physical()? "":"none";
    shipBlock && shipBlock.querySelectorAll("input").forEach(i=>i.required=Cart.physical());
  }
  function initCheckout(){
    const f=document.getElementById("checkout-form"); if(!f) return;
    f.addEventListener("submit",e=>{e.preventDefault();
      const lines=Cart.lines(); const total=Cart.subtotal()+shipping();
      const ref="WL-DEMO-"+Math.random().toString(36).slice(2,8).toUpperCase();
      const root=document.getElementById("checkout-root"); root.dataset.done="1";
      root.innerHTML=`<div class="empty" style="text-align:left;max-width:640px;margin:0 auto"><p class="micro gold">Demo order placed · ${ref}</p><h2 class="big" style="font-size:40px;margin:10px 0 16px">Thank <em>you.</em></h2>
      <p>This was a <b>demonstration checkout</b>. No payment was taken, no card data was collected or transmitted, and no order will be fulfilled.</p>
      <p class="muted">${lines.length} line item(s) · total ${money(total)}</p><a class="btn dark" href="${ROOT}shop.html">Back to the store →</a></div>`;
      Cart.clear(); window.scrollTo(0,0);
    });
  }

  // ---------- news filter
  function initNews(){
    const fl=document.getElementById("news-filters"); if(!fl) return;
    fl.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b) return;
      fl.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));
      document.querySelectorAll("[data-cat]").forEach(n=>n.style.display=(b.dataset.c==="ALL"||n.dataset.cat===b.dataset.c)?"":"none");});
  }

  // ---------- reveal
  function initReveal(){
    const els=document.querySelectorAll(".reveal"); if(!("IntersectionObserver" in window)){els.forEach(e=>e.classList.add("in"));return;}
    const io=new IntersectionObserver(es=>es.forEach(x=>{if(x.isIntersecting){x.target.classList.add("in");io.unobserve(x.target);}}),{threshold:.06});
    els.forEach(e=>io.observe(e));
  }

  document.addEventListener("DOMContentLoaded",()=>{ initShop(); initCheckout(); initNews(); initReveal(); render(); });
  window.addEventListener("storage",render);
})();
