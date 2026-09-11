import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Badge({ available, found = true }) {
  if (!found) return <span className="badge neutral">Não encontrado</span>;
  return (
    <span className={`badge ${available ? "ok" : "no"}`}>
      {available ? "Disponível" : "Indisponível"}
    </span>
  );
}

export default function App() {
  const [tab, setTab] = useState("search");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [rx, setRx] = useState("7000001\n7000003");
  const [rxResult, setRxResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function refreshStatus() {
    try {
      const r = await fetch(`${API}/health`);
      if (r.ok) setStatus(await r.json());
    } catch {}
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  async function search(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const r = await fetch(
        `${API}/api/products/search?q=${encodeURIComponent(query)}`
      );

      if (!r.ok) throw new Error("Não foi possível consultar o stock.");

      setProducts(await r.json());
      refreshStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkRx(e) {
    e.preventDefault();

    const cnpems = rx
      .split(/[\n,; ]+/)
      .map((x) => x.trim())
      .filter(Boolean);

    setLoading(true);
    setError("");
    setRxResult(null);

    try {
      const r = await fetch(`${API}/api/prescriptions/check`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ cnpems }),
      });

      if (!r.ok) throw new Error("Não foi possível verificar a receita.");

      setRxResult(await r.json());
      refreshStatus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header>
        <div className="shell head">
          <div className="brand">
            <span>+</span>
            <div>
              <b>Farmácia</b>
              <small>Disponibilidade de medicamentos</small>
            </div>
          </div>

          <div className="status">
            <i className={status?.products > 0 ? "online" : "offline"} />
            {status?.products > 0
              ? `${status.products} produtos sincronizados`
              : "A aguardar sincronização"}
          </div>
        </div>
      </header>

      <main className="shell">
        <section className="hero">
          <label>Serviço online</label>
          <h1>Veja se os seus medicamentos estão disponíveis.</h1>
          <p>
            A disponibilidade é sincronizada com o sistema local da farmácia.
          </p>
        </section>

        <div className="tabs">
          <button
            className={tab === "search" ? "active" : ""}
            onClick={() => setTab("search")}
          >
            Procurar medicamento
          </button>

          <button
            className={tab === "rx" ? "active" : ""}
            onClick={() => setTab("rx")}
          >
            Verificar receita
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {tab === "search" ? (
          <section className="panel">
            <h2>Pesquisar medicamento</h2>
            <p>Procure por nome ou CNPEM.</p>

            <form className="search" onSubmit={search}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex.: Ben-u-ron, Omeprazol ou CNPEM"
              />
              <button>{loading ? "A pesquisar..." : "Pesquisar"}</button>
            </form>

            <div className="results">
              {products.map((p) => (
                <article className="card" key={`${p.codigo}-${p.cnpem}`}>
                  <div>
                    <h3>{p.nome}</h3>
                    <p>{p.cnpem_desig || "Sem designação CNPEM"}</p>
                    <small>CNPEM: {p.cnpem || "—"}</small>
                  </div>

                  <Badge available={Number(p.stock_farmacia) > 0} />
                </article>
              ))}

              {!loading && products.length === 0 && (
                <div className="empty">
                  Faça uma pesquisa para começar.
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="panel">
            <div className="pill">SPMS será ligado posteriormente</div>
            <h2>Verificar receita</h2>
            <p>
              Durante o desenvolvimento, introduza CNPEMs, um por linha.
            </p>

            <form onSubmit={checkRx}>
              <textarea
                rows="7"
                value={rx}
                onChange={(e) => setRx(e.target.value)}
              />
              <button className="rxbtn">
                {loading ? "A verificar..." : "Verificar disponibilidade"}
              </button>
            </form>

            {rxResult && (
              <div className="results">
                <div
                  className={`summary ${
                    rxResult.all_available ? "sumok" : "sumwarn"
                  }`}
                >
                  {rxResult.all_available
                    ? "Todos os medicamentos estão disponíveis."
                    : "Nem todos os medicamentos estão disponíveis."}
                </div>

                {rxResult.items.map((item) => (
                  <article className="card" key={item.cnpem}>
                    <div>
                      <h3>
                        {item.product?.nome || `CNPEM ${item.cnpem}`}
                      </h3>
                      <p>
                        {item.product?.cnpem_desig || item.cnpem}
                      </p>
                    </div>

                    <Badge
                      found={item.found}
                      available={item.available}
                    />
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="info">
          <div>
            <b>Mac Bridge</b>
            <p>
              O Mac envia automaticamente o stock local para o servidor cloud.
            </p>
          </div>
          <div>
            <b>Railway</b>
            <p>
              O backend público nunca precisa de entrar na rede da farmácia.
            </p>
          </div>
          <div>
            <b>Sifarma</b>
            <p>
              Mais tarde, apenas trocamos a fonte local de mock para Oracle.
            </p>
          </div>
        </section>
      </main>

      <footer className="shell">
        Disponibilidade indicativa. Confirme sempre com a farmácia.
      </footer>
    </>
  );
}
