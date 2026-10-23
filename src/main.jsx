import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  ListOrdered,
  Plus,
  Play,
  Settings2,
  Trash2,
  Pencil,
  X,
  RotateCcw,
  Download,
  Upload,
  Smartphone,
} from "lucide-react";
import { openDB } from "idb";
import "./style.css";

const DB_NAME = "treino-fila-db";
const STORE = "app";
const KEY = "state-v1";
const uid = () => crypto.randomUUID();
const seed = () => ({
  workouts: [],
  history: [],
  session: null,
});

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    },
  });
}
async function loadState() {
  const db = await getDb();
  return await db.get(STORE, KEY);
}
async function saveState(value) {
  const db = await getDb();
  await db.put(STORE, value, KEY);
}

function App() {
  const [data, setData] = useState(null);
  const [view, setView] = useState("fila");
  const [expanded, setExpanded] = useState(null);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [workoutName, setWorkoutName] = useState("");
  const [exerciseForm, setExerciseForm] = useState({
    name: "",
    sets: 3,
    reps: 10,
    rest: 60,
  });
  const [notice, setNotice] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    let alive = true;
    loadState()
      .then((saved) => {
        if (!alive) return;
        if (saved) setData(saved);
        else {
          const initial = seed();
          setData(initial);
          saveState(initial);
        }
      })
      .catch(() => {
        if (alive) {
          const initial = seed();
          setData(initial);
          setNotice("Não foi possível abrir o banco local.");
        }
      });
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      alive = false;
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  useEffect(() => {
    if (data)
      saveState(data).catch(() => setNotice("Erro ao salvar os dados locais."));
  }, [data]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(t);
  }, [notice]);

  const activeWorkout = useMemo(
    () => data?.workouts.find((w) => w.id === data.session?.workoutId),
    [data],
  );
  if (!data) return <main className="loading">Carregando seus treinos…</main>;

  const patchWorkout = (id, updater) =>
    setData((d) => ({
      ...d,
      workouts: d.workouts.map((w) => (w.id === id ? updater(w) : w)),
    }));
  const openWorkoutForm = (workout) => {
    setEditingWorkout(workout?.id || "new");
    setWorkoutName(workout?.name || "");
  };
  const saveWorkout = () => {
    const name = workoutName.trim();
    if (!name) return setNotice("Digite um nome para o conjunto.");
    if (editingWorkout === "new")
      setData((d) => ({
        ...d,
        workouts: [...d.workouts, { id: uid(), name, exercises: [] }],
      }));
    else patchWorkout(editingWorkout, (w) => ({ ...w, name }));
    setEditingWorkout(null);
    setWorkoutName("");
    setNotice("Conjunto salvo.");
  };
  const removeWorkout = (id) => {
    if (!confirm("Excluir este conjunto e seus exercícios?")) return;
    setData((d) => ({
      ...d,
      workouts: d.workouts.filter((w) => w.id !== id),
      session: d.session?.workoutId === id ? null : d.session,
    }));
    setNotice("Conjunto excluído.");
  };
  const openExerciseForm = (workout, exercise = null) => {
    setExpanded(workout.id);
    setEditingExercise({
      workoutId: workout.id,
      exerciseId: exercise?.id || "new",
    });
    setExerciseForm(
      exercise ? { ...exercise } : { name: "", sets: 3, reps: 10, rest: 60 },
    );
  };
  const saveExercise = () => {
    const name = exerciseForm.name.trim();
    const sets = Number(exerciseForm.sets),
      reps = Number(exerciseForm.reps),
      rest = Number(exerciseForm.rest);
    if (
      !name ||
      !Number.isInteger(sets) ||
      sets < 1 ||
      !Number.isInteger(reps) ||
      reps < 1 ||
      !Number.isFinite(rest) ||
      rest < 0
    )
      return setNotice("Confira nome, séries, repetições e descanso.");
    const form = {
      id:
        editingExercise.exerciseId === "new"
          ? uid()
          : editingExercise.exerciseId,
      name,
      sets,
      reps,
      rest: Math.floor(rest),
    };
    patchWorkout(editingExercise.workoutId, (w) => ({
      ...w,
      exercises:
        editingExercise.exerciseId === "new"
          ? [...w.exercises, form]
          : w.exercises.map((e) => (e.id === form.id ? form : e)),
    }));
    setEditingExercise(null);
    setNotice("Exercício salvo.");
  };
  const removeExercise = (workoutId, exerciseId) => {
    patchWorkout(workoutId, (w) => ({
      ...w,
      exercises: w.exercises.filter((e) => e.id !== exerciseId),
    }));
  };
  const startWorkout = (workout) => {
    if (!workout.exercises.length)
      return setNotice("Adicione pelo menos um exercício antes de iniciar.");
    setData((d) => ({
      ...d,
      session: {
        workoutId: workout.id,
        startedAt: new Date().toISOString(),
        completed: [],
      },
    }));
    setView("sessao");
    setNotice("");
  };
  const toggleExercise = (id) =>
    setData((d) => ({
      ...d,
      session: {
        ...d.session,
        completed: d.session.completed.includes(id)
          ? d.session.completed.filter((x) => x !== id)
          : [...d.session.completed, id],
      },
    }));
  const finishWorkout = () => {
    const w = activeWorkout;
    if (!w) return;
    const session = data.session;
    const remaining = data.workouts.filter((x) => x.id !== w.id);
    setData((d) => ({
      ...d,
      workouts: [...remaining, w],
      history: [
        {
          id: uid(),
          workoutId: w.id,
          workoutName: w.name,
          startedAt: session.startedAt,
          finishedAt: new Date().toISOString(),
          completedExercises: session.completed.length,
          totalExercises: w.exercises.length,
        },
        ...d.history,
      ].slice(0, 100),
      session: null,
    }));
    setView("fila");
    setExpanded(null);
    setNotice(`${w.name} finalizado e enviado ao fim da fila.`);
  };
  const moveWorkout = (id, direction) =>
    setData((d) => {
      const list = [...d.workouts],
        index = list.findIndex((w) => w.id === id),
        next = index + direction;
      if (next < 0 || next >= list.length) return d;
      [list[index], list[next]] = [list[next], list[index]];
      return { ...d, workouts: list };
    });
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "treino-fila-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Backup exportado.");
  };
  const importBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.workouts) || !Array.isArray(parsed.history))
        throw new Error();
      if (
        !confirm("Importar este backup substituirá os dados atuais. Continuar?")
      )
        return;
      setData({
        workouts: parsed.workouts,
        history: parsed.history,
        session: parsed.session || null,
      });
      setNotice("Backup importado.");
    } catch {
      setNotice("Arquivo de backup inválido.");
    }
    e.target.value = "";
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark">
          <Dumbbell size={23} />
        </div>
        <div className="brand-copy">
          <strong>Treino Fila</strong>
          <span>Seu treino, organizado.</span>
        </div>
        {installPrompt && (
          <button
            className="icon-button"
            title="Instalar app"
            onClick={async () => {
              await installPrompt.prompt();
              setInstallPrompt(null);
            }}
          >
            <Smartphone size={19} />
          </button>
        )}
      </header>

      <main className="main-content">
        {view === "sessao" && activeWorkout ? (
          <section className="session-page">
            <button className="back-button" onClick={() => setView("fila")}>
              ← Voltar para a fila
            </button>
            <div className="eyebrow">SESSÃO EM ANDAMENTO</div>
            <h1>{activeWorkout.name}</h1>
            <p className="muted">
              Marque cada exercício quando terminar todas as séries.
            </p>
            <div className="progress-wrap">
              <div className="progress-label">
                <span>Progresso</span>
                <strong>
                  {data.session.completed.length}/
                  {activeWorkout.exercises.length}
                </strong>
              </div>
              <div className="progress">
                <span
                  style={{
                    width: `${(data.session.completed.length / activeWorkout.exercises.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="exercise-list">
              {activeWorkout.exercises.map((e, i) => (
                <article
                  className={`exercise-card ${data.session.completed.includes(e.id) ? "is-done" : ""}`}
                  key={e.id}
                >
                  <button
                    className="check-control"
                    aria-label="Marcar exercício"
                    onClick={() => toggleExercise(e.id)}
                  >
                    {data.session.completed.includes(e.id) ? (
                      <Check size={20} />
                    ) : (
                      i + 1
                    )}
                  </button>
                  <div className="exercise-info">
                    <h3>{e.name}</h3>
                    <div className="exercise-stats">
                      <span>
                        <b>{e.sets}</b> séries
                      </span>
                      <span>
                        <b>{e.reps}</b> reps
                      </span>
                      <span>
                        <b>
                          {e.rest >= 60
                            ? `${Math.floor(e.rest / 60)}m${e.rest % 60 ? ` ${e.rest % 60}s` : ""}`
                            : `${e.rest}s`}
                        </b>{" "}
                        descanso
                      </span>
                    </div>
                  </div>
                  <button
                    className="icon-button"
                    title="Editar exercício"
                    onClick={() => openExerciseForm(activeWorkout, e)}
                  >
                    <Pencil size={17} />
                  </button>
                </article>
              ))}
            </div>
            <button className="primary-button full" onClick={finishWorkout}>
              <Check size={18} /> Finalizar treino e mover para o fim
            </button>
            <p className="small-note">
              Você pode finalizar mesmo que não marque todos os exercícios.
            </p>
          </section>
        ) : view === "historico" ? (
          <section>
            <div className="eyebrow">ACOMPANHAMENTO</div>
            <h1>Histórico</h1>
            <p className="muted">
              Seus últimos treinos concluídos neste dispositivo.
            </p>
            {data.history.length === 0 ? (
              <div className="empty-state">
                <ListOrdered size={32} />
                <h3>Nenhum treino concluído</h3>
                <p>Quando você finalizar uma sessão, ela aparecerá aqui.</p>
              </div>
            ) : (
              <div className="history-list">
                {data.history.map((h) => (
                  <article className="history-card" key={h.id}>
                    <div className="history-icon">
                      <Check size={18} />
                    </div>
                    <div className="history-main">
                      <strong>{h.workoutName}</strong>
                      <span>
                        {new Date(h.finishedAt).toLocaleString("pt-BR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <small>
                        {h.completedExercises}/{h.totalExercises} exercícios
                        marcados
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : view === "ajustes" ? (
          <section>
            <div className="eyebrow">SEUS DADOS</div>
            <h1>Configurações</h1>
            <p className="muted">
              Seus dados ficam salvos localmente neste navegador.
            </p>
            <div className="settings-card">
              <div>
                <strong>Exportar backup</strong>
                <p>
                  Salve seus conjuntos, exercícios e histórico em um arquivo
                  JSON.
                </p>
              </div>
              <button className="secondary-button" onClick={exportBackup}>
                <Download size={17} /> Exportar
              </button>
            </div>
            <div className="settings-card">
              <div>
                <strong>Importar backup</strong>
                <p>Restaure um arquivo exportado anteriormente.</p>
              </div>
              <label className="secondary-button file-button">
                <Upload size={17} /> Importar
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={importBackup}
                />
              </label>
            </div>
            <div className="settings-card">
              <div>
                <strong>Excluir Treinos</strong>
                <p>
                  Exclua todos os treinos e o histórico.
                </p>
              </div>
              <button
                className="danger-button"
                onClick={() => {
                  if (
                    confirm(
                      "Isso substituirá todos os treinos e o histórico. Continuar?",
                    )
                  ) {
                    setData(seed());
                    setView("fila");
                    setNotice("Exemplos restaurados.");
                  }
                }}
              >
                <RotateCcw size={17} /> Restaurar
              </button>
            </div>
            <div className="privacy-note">
              Dica: exporte um backup antes de trocar de celular ou limpar os
              dados do navegador.
            </div>
          </section>
        ) : (
          <section>
            <div className="hero-row">
              <div>
                <div className="eyebrow">ROTINA DE TREINO</div>
                <h1>Minha fila</h1>
                <p className="muted">O próximo conjunto está sempre no topo.</p>
              </div>
              <div className="hero-icon">
                <Dumbbell size={27} />
              </div>
            </div>
            {data.session && (
              <div className="resume-banner">
                <div>
                  <strong>Você tem um treino em andamento</strong>
                  <span>
                    {
                      data.workouts.find((w) => w.id === data.session.workoutId)
                        ?.name
                    }
                  </span>
                </div>
                <button onClick={() => setView("sessao")}>Retomar</button>
              </div>
            )}
            {data.workouts.length > 0 && (
              <div className="next-card">
                <div className="next-label">
                  <span className="pulse-dot" /> PRÓXIMO TREINO
                </div>
                <h2>{data.workouts[0].name}</h2>
                <p>
                  {data.workouts[0].exercises.length} exercícios cadastrados
                </p>
                <button
                  className="primary-button full"
                  onClick={() => startWorkout(data.workouts[0])}
                >
                  <Play size={18} fill="currentColor" /> Iniciar treino
                </button>
              </div>
            )}
            <div className="section-heading">
              <div>
                <h2>Conjuntos</h2>
                <span>{data.workouts.length} na fila</span>
              </div>
              <button
                className="secondary-button add-button"
                onClick={() => openWorkoutForm()}
              >
                <Plus size={18} /> Novo conjunto
              </button>
            </div>
            {data.workouts.length === 0 ? (
              <div className="empty-state">
                <Dumbbell size={32} />
                <h3>Comece sua rotina</h3>
                <p>Crie seu primeiro conjunto de exercícios.</p>
                <button
                  className="primary-button"
                  onClick={() => openWorkoutForm()}
                >
                  <Plus size={18} /> Criar conjunto
                </button>
              </div>
            ) : (
              <div className="workout-list">
                {data.workouts.map((w, index) => (
                  <article
                    className={`workout-card ${index === 0 ? "is-next" : ""}`}
                    key={w.id}
                  >
                    <button
                      className="workout-head"
                      onClick={() =>
                        setExpanded(expanded === w.id ? null : w.id)
                      }
                    >
                      <span className="queue-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="workout-title">
                        <strong>{w.name}</strong>
                        <small>{w.exercises.length} exercícios</small>
                      </span>
                      {expanded === w.id ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>
                    {expanded === w.id && (
                      <div className="workout-details">
                        {w.exercises.length ? (
                          <div className="compact-exercises">
                            {w.exercises.map((e) => (
                              <div className="compact-exercise" key={e.id}>
                                <div>
                                  <strong>{e.name}</strong>
                                  <span>
                                    {e.sets} séries × {e.reps} reps · descanso{" "}
                                    {e.rest}s
                                  </span>
                                </div>
                                <div className="mini-actions">
                                  <button
                                    title="Editar"
                                    onClick={() => openExerciseForm(w, e)}
                                  >
                                    <Pencil size={15} />
                                  </button>
                                  <button
                                    title="Excluir"
                                    onClick={() => removeExercise(w.id, e.id)}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="empty-exercises">
                            Ainda não há exercícios neste conjunto.
                          </p>
                        )}
                        <button
                          className="add-exercise"
                          onClick={() => openExerciseForm(w)}
                        >
                          <Plus size={16} /> Adicionar exercício
                        </button>
                        <div className="workout-actions">
                          <button
                            onClick={() => startWorkout(w)}
                            disabled={!w.exercises.length}
                          >
                            <Play size={15} /> Iniciar
                          </button>
                          <button onClick={() => openWorkoutForm(w)}>
                            <Pencil size={15} /> Renomear
                          </button>
                          <button onClick={() => removeWorkout(w.id)}>
                            <Trash2 size={15} /> Excluir
                          </button>
                        </div>
                        <div className="reorder-actions">
                          <span>Reordenar fila</span>
                          <div>
                            <button
                              title="Mover para cima"
                              disabled={index === 0}
                              onClick={() => moveWorkout(w.id, -1)}
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              title="Mover para baixo"
                              disabled={index === data.workouts.length - 1}
                              onClick={() => moveWorkout(w.id, 1)}
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        <button
          className={view === "fila" || view === "sessao" ? "active" : ""}
          onClick={() => setView("fila")}
        >
          <ListOrdered size={20} />
          <span>Fila</span>
        </button>
        <button
          className={view === "historico" ? "active" : ""}
          onClick={() => setView("historico")}
        >
          <Check size={20} />
          <span>Histórico</span>
        </button>
        <button
          className={view === "ajustes" ? "active" : ""}
          onClick={() => setView("ajustes")}
        >
          <Settings2 size={20} />
          <span>Dados</span>
        </button>
      </nav>

      {editingWorkout && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingWorkout(null);
          }}
        >
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              saveWorkout();
            }}
          >
            <div className="modal-heading">
              <div>
                <div className="eyebrow">ORGANIZAÇÃO</div>
                <h2>
                  {editingWorkout === "new"
                    ? "Novo conjunto"
                    : "Editar conjunto"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditingWorkout(null)}
              >
                <X size={20} />
              </button>
            </div>
            <label className="field-label">
              Nome do conjunto
              <input
                autoFocus
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="Ex.: Peito + Tríceps"
                maxLength={70}
              />
            </label>
            <button className="primary-button full" type="submit">
              Salvar conjunto
            </button>
          </form>
        </div>
      )}

      {editingExercise && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingExercise(null);
          }}
        >
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              saveExercise();
            }}
          >
            <div className="modal-heading">
              <div>
                <div className="eyebrow">CONFIGURAR EXERCÍCIO</div>
                <h2>
                  {editingExercise.exerciseId === "new"
                    ? "Novo exercício"
                    : "Editar exercício"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditingExercise(null)}
              >
                <X size={20} />
              </button>
            </div>
            <label className="field-label">
              Nome do exercício
              <input
                autoFocus
                value={exerciseForm.name}
                onChange={(e) =>
                  setExerciseForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ex.: Supino reto"
                maxLength={80}
              />
            </label>
            <div className="form-grid">
              <label className="field-label">
                Séries
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={exerciseForm.sets}
                  onChange={(e) =>
                    setExerciseForm((f) => ({ ...f, sets: e.target.value }))
                  }
                />
              </label>
              <label className="field-label">
                Repetições
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={exerciseForm.reps}
                  onChange={(e) =>
                    setExerciseForm((f) => ({ ...f, reps: e.target.value }))
                  }
                />
              </label>
            </div>
            <label className="field-label">
              Descanso entre séries (segundos)
              <input
                type="number"
                min="0"
                max="3600"
                value={exerciseForm.rest}
                onChange={(e) =>
                  setExerciseForm((f) => ({ ...f, rest: e.target.value }))
                }
              />
            </label>
            <button className="primary-button full" type="submit">
              Salvar exercício
            </button>
          </form>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
