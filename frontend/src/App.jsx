import React, { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const SearchIcon = () => <span aria-hidden="true">⌕</span>;
const RxIcon = () => <span aria-hidden="true">▤</span>;

function Availability({ available, found = true }) {
  if (!found) return <span className="availability neutral"><i />Não encontrado</span>;
  return (
    <span className={`availability ${available ? "available" : "unavailable"}`}>
      <i />{available ? "Disponível" : "Indisponível"}
    </span>
  );
}

function ProductCard({ product }) {
  const available = Number(product.stock_farmacia) > 0;
  return (
    <article className="product-card">
      <div className="medicine-icon">+</div>
      <div className="product-copy">
        <h3>{product.nome}</h3>
        <p>{product.cnpem_desig || "Medicamento"}</p>
        <small>CNPEM {product.cnpem || "—"}</small>
      </div>
      <Availability available={available} />
    </article>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [rx, setRx] = useState("7000001\n7000003");
  const [rxResult, setRxResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const fileRef = useRef(null);

  async function refreshStatus() {
    try {
      const response = await fetch(`${API}/health`);
      if (response.ok) setStatus(await response.json());
    } catch {
      setStatus(null);
    }
  }

  useEffect(() => { refreshStatus(); }, []);

  const isOnline = Number(status?.products || 0) > 0;
  const syncedText = useMemo(() => isOnline ? `${status.products} produtos sincronizados` : "A aguardar sincronização", [isOnline, status]);

  function go(next) {
    setView(next);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function search(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(""); setProducts([]);
    try {
      const response = await fetch(`${API}/api/products/search?q=${encodeURIComponent(query.trim())}`);
      if (!response.ok) throw new Error("Não foi possível consultar o stock neste momento.");
      setProducts(await response.json());
      refreshStatus();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function checkRx(e) {
    e.preventDefault();
    const cnpems = rx.split(/[\n,; ]+/).map(x => x.trim()).filter(Boolean);
    if (!cnpems.length) return;
    setLoading(true); setError(""); setRxResult(null);
    try {
      const response = await fetch(`${API}/api/prescriptions/check`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cnpems })
      });
      if (!response.ok) throw new Error("Não foi possível verificar a receita neste momento.");
      setRxResult(await response.json());
      refreshStatus();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="shell nav-wrap">
          <button className="brand" onClick={() => go("home")} aria-label="Início">
            <span className="brand-mark">+</span>
            <span><strong>Farmácia Nave Ribeiro</strong><small>Disponibilidade de medicamentos</small></span>
          </button>
          <nav>
            <button className={view === "home" ? "active" : ""} onClick={() => go("home")}>Início</button>
            <button className={view === "search" ? "active" : ""} onClick={() => go("search")}>Medicamentos</button>
            <button className={view === "prescription" ? "active" : ""} onClick={() => go("prescription")}>Receita</button>
          </nav>
          <div className={`sync ${isOnline ? "online" : "waiting"}`}><i /> <span>{syncedText}</span></div>
        </div>
      </header>

      {view === "home" && (
        <main>
          <section className="hero-section">
            <div className="shell hero-grid">
              <div className="hero-copy">
                <span className="eyebrow"><i /> SERVIÇO ONLINE</span>
                <h1>Saiba se o seu medicamento está <em>disponível.</em></h1>
                <p>Consulte a disponibilidade antes de se deslocar à farmácia. Rápido, simples e atualizado.</p>
                <div className="hero-actions">
                  <button className="primary" onClick={() => go("search")}><SearchIcon /> Procurar medicamento</button>
                  <button className="secondary" onClick={() => go("prescription")}><RxIcon /> Verificar receita</button>
                </div>
                <div className="trust-row"><span>✓ Dados protegidos</span><span>✓ Stock sincronizado</span><span>✓ Sem registo</span></div>
              </div>
              <div className="hero-visual" aria-hidden="true">
                <div className="phone-card">
                  <div className="phone-head"><span className="mini-mark">+</span><b>Farmácia Nave Ribeiro</b></div>
                  <div className="mock-search">⌕ &nbsp; Procurar medicamento...</div>
                  <div className="mock-result"><span className="mock-box">+</span><span><b>Ben-u-ron 500 mg</b><small>Paracetamol</small></span><span className="mock-ok">● Disponível</span></div>
                  <div className="mock-result"><span className="mock-box">+</span><span><b>Omeprazol 20 mg</b><small>Omeprazol</small></span><span className="mock-ok">● Disponível</span></div>
                  <div className="mock-note">✓ Stock atualizado automaticamente</div>
                </div>
              </div>
            </div>
          </section>

          <section className="shell quick-section">
            <div className="section-title"><span>COMO PODEMOS AJUDAR?</span><h2>Escolha como quer consultar</h2></div>
            <div className="quick-grid">
              <button className="quick-card" onClick={() => go("search")}><span className="quick-icon"><SearchIcon /></span><span><strong>Procurar medicamento</strong><small>Pesquise pelo nome ou código CNPEM e consulte a disponibilidade.</small><b>Começar pesquisa →</b></span></button>
              <button className="quick-card" onClick={() => go("prescription")}><span className="quick-icon"><RxIcon /></span><span><strong>Verificar receita</strong><small>Consulte de uma só vez a disponibilidade dos medicamentos da sua receita.</small><b>Verificar receita →</b></span></button>
            </div>
          </section>

          <section className="how-section">
            <div className="shell">
              <div className="section-title centered"><span>SIMPLES E RÁPIDO</span><h2>Como funciona</h2></div>
              <div className="steps">
                <div><b>1</b><strong>Pesquise</strong><p>Indique o medicamento que procura ou os códigos da receita.</p></div>
                <div><b>2</b><strong>Consulte</strong><p>Verificamos a disponibilidade com os dados sincronizados da farmácia.</p></div>
                <div><b>3</b><strong>Confirme</strong><p>Veja o resultado e contacte a farmácia se precisar de ajuda.</p></div>
              </div>
            </div>
          </section>
        </main>
      )}

      {view === "search" && (
        <main className="shell page">
          <button className="back" onClick={() => go("home")}>← Voltar ao início</button>
          <span className="eyebrow"><SearchIcon /> MEDICAMENTOS</span>
          <h1 className="page-title">Que medicamento procura?</h1>
          <p className="page-lead">Pesquise pelo nome do medicamento ou pelo código CNPEM.</p>
          <form className="big-search" onSubmit={search}><SearchIcon /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Ex.: Ben-u-ron, Omeprazol ou CNPEM"/><button disabled={loading}>{loading ? "A pesquisar..." : "Pesquisar"}</button></form>
          {error && <div className="error">{error}</div>}
          {!loading && products.length > 0 && <div className="result-heading"><b>{products.length} resultado{products.length !== 1 ? "s" : ""}</b><span>Disponibilidade indicativa</span></div>}
          <div className="product-list">{products.map(p => <ProductCard key={`${p.codigo}-${p.cnpem}`} product={p} />)}</div>
          {!loading && query && products.length === 0 && !error && <div className="empty-state">Faça a pesquisa para ver os resultados.</div>}
        </main>
      )}

      {view === "prescription" && (
        <main className="shell page prescription-page">
          <button className="back" onClick={() => go("home")}>← Voltar ao início</button>
          <span className="eyebrow"><RxIcon /> RECEITA</span>
          <h1 className="page-title">Verificar a sua receita</h1>
          <p className="page-lead">Enquanto a ligação à validação da receita está em desenvolvimento, pode testar a disponibilidade introduzindo os CNPEMs.</p>
          <div className="rx-layout">
            <section className="rx-card">
              <div className="upload-zone" onClick={() => fileRef.current?.click()}><span className="upload-icon">⇧</span><strong>Carregar receita</strong><p>Fotografia ou PDF da receita</p><small>{selectedFile ? selectedFile.name : "Selecionar ficheiro"}</small><input ref={fileRef} type="file" accept="image/*,.pdf" hidden onChange={e => setSelectedFile(e.target.files?.[0] || null)} /></div>
              <div className="or"><span />ou<span /></div>
              <form onSubmit={checkRx}><label>Introduzir CNPEMs <small>(modo de desenvolvimento)</small></label><textarea rows="6" value={rx} onChange={e => setRx(e.target.value)} placeholder="Um CNPEM por linha"/><button className="primary full" disabled={loading}>{loading ? "A verificar..." : "Verificar disponibilidade"}</button></form>
            </section>
            <aside className="rx-help"><strong>Como encontrar o CNPEM?</strong><p>Durante esta fase de testes usamos os códigos CNPEM para simular os medicamentos de uma receita.</p><div className="dev-pill">Integração SPMS: fase posterior</div></aside>
          </div>
          {error && <div className="error">{error}</div>}
          {rxResult && <section className="rx-results"><div className={`rx-summary ${rxResult.all_available ? "good" : "warn"}`}><b>{rxResult.all_available ? "Todos os medicamentos estão disponíveis" : "Existem medicamentos sem disponibilidade"}</b><span>Resultado baseado no stock atualmente sincronizado.</span></div>{rxResult.items.map(item => <article className="product-card" key={item.cnpem}><div className="medicine-icon">+</div><div className="product-copy"><h3>{item.product?.nome || `CNPEM ${item.cnpem}`}</h3><p>{item.product?.cnpem_desig || item.cnpem}</p></div><Availability found={item.found} available={item.available}/></article>)}</section>}
        </main>
      )}

      <footer><div className="shell footer-wrap"><div className="footer-brand"><span className="brand-mark">+</span><span><strong>Farmácia Nave Ribeiro</strong><small>Ao serviço da sua saúde.</small></span></div><p>A disponibilidade apresentada é indicativa. Confirme sempre com a farmácia antes de se deslocar.</p></div></footer>
    </div>
  );
}
