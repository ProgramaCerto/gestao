import React, { useState, useEffect } from "react";
import { 
  FolderGit2, 
  Plus, 
  Play, 
  Download, 
  RotateCcw, 
  RotateCw, 
  Search, 
  Copy, 
  Check, 
  X, 
  FileCode, 
  Trash2, 
  RefreshCw, 
  Terminal, 
  Monitor, 
  ChevronRight, 
  FolderOpen,
  Code2,
  Sparkles,
  Link2,
  KeyRound,
  ExternalLink,
  Edit3,
  Calendar,
  Layers,
  ArrowRight,
  GraduationCap
} from "lucide-react";
import { CodeProject, ProjectFile, Trilha } from "../types";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const INITIAL_PROJECTS: CodeProject[] = [
  {
    id: "proj-1",
    title: "Jsjxh",
    description: "Projeto criado pelo aluno no curso de Web Design. Inclui estrutura HTML5, estilização moderna CSS e scripts de interação JS.",
    courseTag: "CURSO DE WEB DESIGN HTML/CSS",
    activeFileName: "Style.css",
    createdAt: "2026-07-20",
    updatedAt: "2026-07-23",
    files: [
      {
        name: "index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meu Projeto Jsjxh</title>
  <link rel="stylesheet" href="Style.css">
</head>
<body>
  <div class="card">
    <h1>Bem-vindo ao Meu Projeto! 👋</h1>
    <p>Este é um exemplo de projeto HTML, CSS e JavaScript editável diretamente no navegador.</p>
    <button id="btn" onclick="saudacao()">Clique Aqui</button>
    <div id="output"></div>
  </div>
  <script src="script.js"></script>
</body>
</html>`
      },
      {
        name: "Style.css",
        language: "css",
        content: `/* Escreva seu código HTML, CSS ou JavaScript aqui... */
body {
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
  color: #f8fafc;
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2.5rem;
  border-radius: 1.5rem;
  text-align: center;
  max-width: 420px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
}

h1 {
  font-size: 1.5rem;
  color: #38bdf8;
  margin-bottom: 1rem;
}

p {
  color: #94a3b8;
  font-size: 0.95rem;
  line-height: 1.6;
}

button {
  margin-top: 1.5rem;
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-weight: bold;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
}`
      },
      {
        name: "script.js",
        language: "js",
        content: `// Código JavaScript interativo
function saudacao() {
  const output = document.getElementById('output');
  output.innerHTML = '<p style="color: #4ade80; margin-top: 15px; font-weight: bold;">🎉 Parabéns! Seu código JavaScript funcionou perfeitamente.</p>';
  console.log("Ação do botão executada com sucesso!");
}`
      }
    ]
  },
  {
    id: "proj-2",
    title: "Projeto 01 - Landing Page Interativa",
    description: "Página inicial responsiva desenvolvida com botões interativos, seções de destaques e transições suaves de tema.",
    courseTag: "CURSO DE HTML & CSS BÁSICO",
    activeFileName: "index.html",
    createdAt: "2026-07-15",
    updatedAt: "2026-07-22",
    files: [
      {
        name: "index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Landing Page Interativa</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 60px 20px; background: #090d16; color: white; }
    h1 { color: #60a5fa; font-size: 2.2rem; }
    p { color: #94a3b8; max-width: 500px; margin: 20px auto; line-height: 1.6; }
    .btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; font-weight: bold; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Landing Page Interativa 🚀</h1>
  <p>Aprenda HTML e CSS na prática com os cursos do Programa Certo!</p>
  <button class="btn" onclick="alert('Bem-vindo à nossa Landing Page!')">Explorar Cursos</button>
</body>
</html>`
      },
      {
        name: "style.css",
        language: "css",
        content: `/* Estilos da Landing Page */\nbody { font-family: system-ui, sans-serif; }`
      }
    ]
  },
  {
    id: "proj-3",
    title: "Projeto 02 - Calculadora e Conversor",
    description: "Calculadora de médias escolares e utilitário de conversão dinâmica de moedas e unidades com JavaScript.",
    courseTag: "LÓGICA DE PROGRAMAÇÃO JS",
    activeFileName: "script.js",
    createdAt: "2026-07-18",
    updatedAt: "2026-07-21",
    files: [
      {
        name: "index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 30px; background: #0f172a; color: white; }
    input, button { padding: 10px; margin: 5px; border-radius: 6px; border: none; }
    button { background: #10b981; color: white; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <h2>Calculadora de Média 📊</h2>
  <input type="number" id="n1" placeholder="Nota 1">
  <input type="number" id="n2" placeholder="Nota 2">
  <button onclick="calcular()">Calcular</button>
  <p id="res"></p>

  <script>
    function calcular() {
      const v1 = parseFloat(document.getElementById('n1').value) || 0;
      const v2 = parseFloat(document.getElementById('n2').value) || 0;
      const media = (v1 + v2) / 2;
      document.getElementById('res').innerText = "Média Final: " + media.toFixed(1);
    }
  </script>
</body>
</html>`
      },
      {
        name: "script.js",
        language: "js",
        content: `console.log("Calculadora inicializada com sucesso.");`
      }
    ]
  },
  {
    id: "proj-4",
    title: "Projeto 03 - Mini Jogo da Adivinhação",
    description: "Jogo interativo onde o jogador tenta adivinhar o número secreto com contador de tentativas e dicas dinâmicas.",
    courseTag: "DESENVOLVIMENTO WEB FRONT-END",
    activeFileName: "index.html",
    createdAt: "2026-07-20",
    updatedAt: "2026-07-23",
    files: [
      {
        name: "index.html",
        language: "html",
        content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; text-align: center; padding: 40px; background: #111827; color: white; }
    .box { background: #1f2937; padding: 30px; border-radius: 12px; max-width: 400px; margin: 0 auto; }
    button { background: #8b5cf6; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="box">
    <h2>🎯 Jogo da Adivinhação</h2>
    <p>Tente adivinhar o número entre 1 e 100!</p>
    <input type="number" id="palpite" placeholder="Seu palpite" style="padding: 10px; border-radius: 6px; width: 80%;">
    <br>
    <button onclick="jogar()">Adivinhar</button>
    <p id="dica" style="color: #a7f3d0; margin-top: 15px; font-weight: bold;"></p>
  </div>

  <script>
    const segredo = Math.floor(Math.random() * 100) + 1;
    function jogar() {
      const p = parseInt(document.getElementById('palpite').value);
      const dica = document.getElementById('dica');
      if (p === segredo) dica.innerText = "🎉 Parabéns! Você acertou!";
      else if (p < segredo) dica.innerText = "💡 O número secreto é MAIOR!";
      else dica.innerText = "💡 O número secreto é MENOR!";
    }
  </script>
</body>
</html>`
      }
    ]
  }
];

interface ProjectsViewProps {
  selectedTrilhaId?: string | number;
  setSelectedTrilhaId?: (id: any) => void;
  trilhas?: Trilha[];
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  selectedTrilhaId = "",
  setSelectedTrilhaId,
  trilhas = []
}) => {
  // Load stored projects or use defaults
  const [projects, setProjects] = useState<CodeProject[]>(() => {
    if (isSupabaseConfigured) return [];
    try {
      const stored = localStorage.getItem("programacerto_code_projects");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading projects:", e);
    }
    return INITIAL_PROJECTS;
  });

  // Active Selected Project ID for Editor / Live Preview
  const [activeProjectId, setActiveProjectId] = useState<string>("");

  // Search Filter
  const [searchTerm, setSearchTerm] = useState("");

  // Editor Modal Control
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);

  // Active File Name inside Editor Modal
  const [activeFileName, setActiveFileName] = useState<string>("index.html");

  // Other Modals
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState<boolean>(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState<boolean>(false);

  // New Project Form
  const [newProjTitle, setNewProjTitle] = useState("");
  const [newProjCourseTag, setNewProjCourseTag] = useState("CURSO DE DESENVOLVIMENTO WEB");
  const [newProjDesc, setNewProjDesc] = useState("");

  // New File Form
  const [newFileName, setNewFileName] = useState("");

  // Copy status
  const [copied, setCopied] = useState(false);

  // Live Preview Tabs: 'preview' | 'console'
  const [previewTab, setPreviewTab] = useState<"preview" | "console">("preview");
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: "log" | "error" | "info"; msg: string }>>([]);

  // Project Progress Tracking (projeto_progresso)
  const [projectProgress, setProjectProgress] = useState<{
    [projId: string]: {
      id?: string;
      id_do_projeto: string;
      matricula_usuario?: string;
      id_do_usuario?: string;
      status: "Não iniciado" | "Em andamento" | "Finalizado";
      id_epc: string;
    };
  }>({});

  const [statusFilter, setStatusFilter] = useState<"todos" | "em_andamento" | "finalizado">("todos");

  const [linkModalProjId, setLinkModalProjId] = useState<string | null>(null);
  const [inputProjectEpc, setInputProjectEpc] = useState("");

  // Save projects to localStorage only when offline / not configured
  useEffect(() => {
    if (!isSupabaseConfigured) {
      try {
        localStorage.setItem("programacerto_code_projects", JSON.stringify(projects));
      } catch (e) {
        console.error("Error saving projects:", e);
      }
    }
  }, [projects]);

  // Load projects and project progress from Supabase if configured
  useEffect(() => {
    async function loadSupabaseProjects() {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const { data: authUser } = await supabase.auth.getUser();
        let currentUserId = authUser?.user?.id || "";
        const currentUserEmail = authUser?.user?.email || "";
        if (currentUserEmail) {
          const { data: uRow } = await supabase
            .from("usuarios")
            .select("matricula")
            .ilike("email", currentUserEmail)
            .limit(1)
            .maybeSingle();
          if (uRow?.matricula) {
            currentUserId = String(uRow.matricula);
          }
        }

        let queryProjetos = supabase.from("projetos_cursos").select("*");
        const { data: dbProjetos, error: projErr } = await queryProjetos;

        const loaded: CodeProject[] = [];

        if (!projErr && dbProjetos && dbProjetos.length > 0) {
          for (const p of dbProjetos) {
            const strId = String(p.id);
            if (!loaded.some(lp => lp.id === strId)) {
              const defaultFiles: ProjectFile[] = [
                { name: "index.html", language: "html", content: `<!DOCTYPE html>\n<html>\n<body>\n  <h1>${p.nome_do_projeto}</h1>\n</body>\n</html>` },
                { name: "style.css", language: "css", content: "body { font-family: sans-serif; }" }
              ];

              loaded.push({
                id: strId,
                title: p.nome_do_projeto,
                description: p.descricao || "Projeto prático.",
                courseTag: "PROJETO PRÁTICO",
                activeFileName: "index.html",
                createdAt: p.data_criacao ? String(p.data_criacao).split("T")[0] : new Date().toISOString().split("T")[0],
                updatedAt: p.data_atualizacao ? String(p.data_atualizacao).split("T")[0] : new Date().toISOString().split("T")[0],
                id_trilha: p.id_trilha !== undefined && p.id_trilha !== null ? String(p.id_trilha) : null,
                files: defaultFiles
              });
            }
          }
        }

        setProjects(loaded);
        if (loaded.length > 0) {
          setActiveProjectId(loaded[0].id);
        }

        // Load project progress from 'projeto_progresso' (using matricula_usuario, fallback to id_do_usuario / 'projetos_progresso')
        let queryProg = supabase.from("projeto_progresso").select("*");
        if (currentUserId) {
          queryProg = queryProg.eq("matricula_usuario", currentUserId);
        }
        let { data: dbProg, error: progErr } = await queryProg;
        if (progErr || !dbProg || dbProg.length === 0) {
          let fallbackQuery1 = supabase.from("projeto_progresso").select("*");
          if (currentUserId) {
            fallbackQuery1 = fallbackQuery1.eq("id_do_usuario", currentUserId);
          }
          const fb1 = await fallbackQuery1;
          if (!fb1.error && fb1.data && fb1.data.length > 0) {
            dbProg = fb1.data;
          } else {
            let fallbackQuery2 = supabase.from("projetos_progresso").select("*");
            if (currentUserId) {
              fallbackQuery2 = fallbackQuery2.eq("matricula_usuario", currentUserId);
            }
            const fb2 = await fallbackQuery2;
            dbProg = fb2.data;
          }
        }

        if (dbProg && dbProg.length > 0) {
          const pMap: any = {};
          dbProg.forEach((item: any) => {
            if (item.id_do_projeto) {
              const matVal = String(item.matricula_usuario || item.id_do_usuario || "");
              pMap[String(item.id_do_projeto)] = {
                id: String(item.id),
                id_do_projeto: String(item.id_do_projeto),
                matricula_usuario: matVal,
                id_do_usuario: matVal,
                status: item.status || "Não iniciado",
                id_epc: item.id_epc || item.link_do_projeto || ""
              };
            }
          });
          setProjectProgress(pMap);
        }
      } catch (err) {
        console.error("Erro ao carregar projetos do Supabase:", err);
      }
    }

    loadSupabaseProjects();
  }, []);

  // Track-filtered projects
  const trackProjects = projects.filter(p => {
    if (!selectedTrilhaId) return false;
    if (p.id_trilha !== undefined && p.id_trilha !== null && String(p.id_trilha) !== "") {
      return String(p.id_trilha) === String(selectedTrilhaId);
    }
    return true;
  });

  // Active project reference
  const activeProject = trackProjects.find(p => p.id === activeProjectId) || trackProjects[0] || projects[0];
  const activeFile = activeProject?.files.find(f => f.name === activeFileName) || activeProject?.files[0];

  // Filtered projects by search term and status filter
  const filteredProjects = trackProjects.filter(p => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.courseTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());

    const st = projectProgress[p.id]?.status || "Não iniciado";
    let matchesStatus = true;
    if (statusFilter === "em_andamento") matchesStatus = st === "Em andamento";
    if (statusFilter === "finalizado") matchesStatus = st === "Finalizado";

    return matchesSearch && matchesStatus;
  });

  // Helper to safely write progress to 'projeto_progresso' (using matricula_usuario)
  const upsertProjectProgressDb = async (projId: string, statusVal: string, epcVal?: string | null) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const numId = parseInt(projId, 10) || projId;
      const { data: authUser } = await supabase.auth.getUser();
      let uMat = authUser?.user?.id || null;
      const uEmail = authUser?.user?.email || "";
      if (uEmail) {
        const { data: uRow } = await supabase
          .from("usuarios")
          .select("matricula")
          .ilike("email", uEmail)
          .limit(1)
          .maybeSingle();
        if (uRow?.matricula) {
          uMat = String(uRow.matricula);
        }
      }

      // Try 'projeto_progresso' with matricula_usuario
      let query1 = supabase.from("projeto_progresso").select("id").eq("id_do_projeto", numId);
      if (uMat) query1 = query1.eq("matricula_usuario", uMat);
      let { data: existing, error: pErr } = await query1.limit(1).maybeSingle();

      if (!pErr) {
        if (existing) {
          await supabase.from("projeto_progresso").update({
            status: statusVal,
            id_epc: epcVal ?? null,
            ...(uMat ? { matricula_usuario: uMat } : {})
          }).eq("id", existing.id);
        } else {
          await supabase.from("projeto_progresso").insert({
            id_do_projeto: numId,
            matricula_usuario: uMat,
            status: statusVal,
            id_epc: epcVal ?? null
          });
        }
        return;
      }

      // Fallback 'projeto_progresso' with id_do_usuario or 'projetos_progresso'
      let query2 = supabase.from("projetos_progresso").select("id").eq("id_do_projeto", numId);
      if (uMat) query2 = query2.eq("matricula_usuario", uMat);
      const { data: existing2 } = await query2.limit(1).maybeSingle();

      if (existing2) {
        await supabase.from("projetos_progresso").update({
          status: statusVal,
          id_epc: epcVal ?? null,
          ...(uMat ? { matricula_usuario: uMat } : {})
        }).eq("id", existing2.id);
      } else {
        await supabase.from("projetos_progresso").insert({
          id_do_projeto: numId,
          matricula_usuario: uMat,
          status: statusVal,
          id_epc: epcVal ?? null
        });
      }
    } catch (err) {
      console.error("Erro ao atualizar progresso do projeto:", err);
    }
  };

  // Open Studio project link and record progress
  const handleOpenStudioLink = (projId: string) => {
    window.open("https://estudio-programacerto.netlify.app/", "_blank");

    const currentProg = projectProgress[projId];
    if (!currentProg || currentProg.status !== "Finalizado") {
      const updatedProg = {
        id_do_projeto: projId,
        status: "Em andamento" as const,
        id_epc: currentProg?.id_epc || ""
      };
      setProjectProgress(prev => ({ ...prev, [projId]: updatedProg }));
      upsertProjectProgressDb(projId, "Em andamento", currentProg?.id_epc || null);
    }
  };

  // Open Project in Code Editor
  const handleOpenEditor = (projId: string) => {
    const proj = projects.find(p => p.id === projId) || projects[0];
    setActiveProjectId(projId);
    setActiveFileName(proj.activeFileName || proj.files[0]?.name || "index.html");
    setIsEditorOpen(true);

    // Update status to "Em andamento" if currently "Não iniciado"
    const currentProg = projectProgress[projId];
    if (!currentProg || currentProg.status === "Não iniciado") {
      const updatedProg = {
        id_do_projeto: projId,
        status: "Em andamento" as const,
        id_epc: currentProg?.id_epc || ""
      };
      setProjectProgress(prev => ({ ...prev, [projId]: updatedProg }));
      upsertProjectProgressDb(projId, "Em andamento", currentProg?.id_epc || null);
    }
  };

  // Submit/Save Project ID EPC
  const handleSaveProjectEpc = async (projId: string, epcValue: string) => {
    const trimmed = epcValue.trim();
    const newStatus = trimmed ? "Finalizado" : "Em andamento";

    setProjectProgress(prev => ({
      ...prev,
      [projId]: {
        ...prev[projId],
        id_do_projeto: projId,
        status: newStatus,
        id_epc: trimmed
      }
    }));

    await upsertProjectProgressDb(projId, newStatus, trimmed || null);

    setLinkModalProjId(null);
    setInputProjectEpc("");
  };

  // Run Live Preview
  const handleOpenPreview = (projId: string) => {
    setActiveProjectId(projId);
    setConsoleLogs([]);
    setIsLivePreviewOpen(true);
    setPreviewTab("preview");
  };

  // Update active file content inside code editor
  const handleCodeChange = async (newContent: string) => {
    if (!activeProject || !activeFile) return;

    setProjects(prevProjects =>
      prevProjects.map(proj => {
        if (proj.id === activeProject.id) {
          return {
            ...proj,
            updatedAt: new Date().toISOString().split("T")[0],
            files: proj.files.map(file => {
              if (file.name === activeFile.name) {
                return { ...file, content: newContent };
              }
              return file;
            })
          };
        }
        return proj;
      })
    );
  };

  // Handle Tab Key in Editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      const updated = val.substring(0, start) + "  " + val.substring(end);
      handleCodeChange(updated);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Copy code
  const handleCopyCode = () => {
    if (activeFile) {
      navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Create New File inside editor
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !activeProject) return;

    let lang: "html" | "css" | "js" = "html";
    if (newFileName.endsWith(".css")) lang = "css";
    else if (newFileName.endsWith(".js")) lang = "js";

    const name = newFileName.trim();

    if (activeProject.files.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      alert("Já existe um arquivo com esse nome no projeto.");
      return;
    }

    const initContent = `/* Arquivo ${name} */\n`;

    setProjects(prev =>
      prev.map(p => {
        if (p.id === activeProject.id) {
          return {
            ...p,
            files: [...p.files, { name, language: lang, content: initContent }]
          };
        }
        return p;
      })
    );

    setActiveFileName(name);
    setNewFileName("");
    setIsNewFileModalOpen(false);
  };

  // Delete File
  const handleDeleteFile = async (fileName: string) => {
    if (!activeProject) return;
    if (activeProject.files.length <= 1) {
      alert("O projeto deve ter pelo menos um arquivo.");
      return;
    }

    if (confirm(`Tem certeza que deseja remover o arquivo ${fileName}?`)) {
      setProjects(prev =>
        prev.map(p => {
          if (p.id === activeProject.id) {
            const updatedFiles = p.files.filter(f => f.name !== fileName);
            return {
              ...p,
              files: updatedFiles
            };
          }
          return p;
        })
      );

      if (activeFileName === fileName) {
        const remaining = activeProject.files.filter(f => f.name !== fileName);
        setActiveFileName(remaining[0]?.name || "index.html");
      }
    }
  };

  // Create New Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjTitle.trim()) return;

    const title = newProjTitle.trim();
    const desc = newProjDesc.trim() || "Projeto prático criado pelo aluno.";
    const courseTag = newProjCourseTag.trim() || "CURSO DE DESENVOLVIMENTO WEB";

    let newId = `proj-${Date.now()}`;

    const defaultHtml = `<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n  <meta charset="UTF-8">\n  <title>${title}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>${title}</h1>\n  <p>Comece a programar aqui!</p>\n</body>\n</html>`;
    const defaultCss = `/* Estilos para ${title} */\nbody {\n  font-family: system-ui, sans-serif;\n  padding: 2rem;\n  background: #0f172a;\n  color: #fff;\n}`;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: insertedProj, error: pErr } = await supabase
          .from("projetos_cursos")
          .insert({
            nome_do_projeto: title,
            descricao: desc
          })
          .select()
          .single();

        if (!pErr && insertedProj) {
          newId = String(insertedProj.id);
          const { error: insErr } = await supabase.from("projeto_progresso").insert({
            id_do_projeto: newId,
            status: "Não iniciado",
            id_epc: null
          });
          if (insErr) {
            await supabase.from("projetos_progresso").insert({
              id_do_projeto: newId,
              status: "Não iniciado",
              id_epc: null
            });
          }
        }
      } catch (err) {
        console.error("Erro ao criar projeto no Supabase:", err);
      }
    }

    const newProject: CodeProject = {
      id: newId,
      title,
      description: desc,
      courseTag,
      activeFileName: "index.html",
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
      files: [
        {
          name: "index.html",
          language: "html",
          content: defaultHtml
        },
        {
          name: "style.css",
          language: "css",
          content: defaultCss
        }
      ]
    };

    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newId);
    setActiveFileName("index.html");
    setIsNewProjectModalOpen(false);

    setNewProjTitle("");
    setNewProjDesc("");
  };

  // Delete Project
  const handleDeleteProject = async (projId: string) => {
    if (confirm("Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.")) {
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from("projeto_progresso").delete().eq("id_do_projeto", projId);
          await supabase.from("projetos_progresso").delete().eq("id_do_projeto", projId);
          await supabase.from("projetos_cursos").delete().eq("id", projId);
        } catch (err) {
          console.error("Erro ao deletar projeto do Supabase:", err);
        }
      }

      const remaining = projects.filter(p => p.id !== projId);
      setProjects(remaining);
      if (activeProjectId === projId) {
        setActiveProjectId(remaining[0].id);
      }
    }
  };

  // Download project as zip/txt
  const handleDownloadProject = (projId?: string) => {
    const projToDownload = projects.find(p => p.id === (projId || activeProjectId)) || activeProject;
    if (!projToDownload) return;

    const combinedContent = projToDownload.files
      .map(f => `/* ==================== ${f.name} ==================== */\n\n${f.content}`)
      .join("\n\n");

    const blob = new Blob([combinedContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projToDownload.title.toLowerCase().replace(/\s+/g, "_")}_codigo.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Build iframe srcDoc for live execution
  const buildIframeSource = () => {
    if (!activeProject) return "";

    const htmlFile = activeProject.files.find(f => f.name.endsWith(".html")) || activeProject.files[0];
    const cssFiles = activeProject.files.filter(f => f.name.endsWith(".css"));
    const jsFiles = activeProject.files.filter(f => f.name.endsWith(".js"));

    let htmlContent = htmlFile?.content || "<h1>Projeto sem arquivo HTML</h1>";

    const cssInjections = cssFiles.map(c => `<style>${c.content}</style>`).join("\n");
    if (htmlContent.includes("</head>")) {
      htmlContent = htmlContent.replace("</head>", `${cssInjections}\n</head>`);
    } else {
      htmlContent = `${cssInjections}\n${htmlContent}`;
    }

    const consoleInterceptor = `
    <script>
      (function() {
        var _log = console.log;
        var _error = console.error;
        var _info = console.info;

        function sendToParent(type, args) {
          try {
            var msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            window.parent.postMessage({ type: 'CONSOLE_LOG', logType: type, msg: msg }, '*');
          } catch(e) {}
        }

        console.log = function() { sendToParent('log', arguments); _log.apply(console, arguments); };
        console.error = function() { sendToParent('error', arguments); _error.apply(console, arguments); };
        console.info = function() { sendToParent('info', arguments); _info.apply(console, arguments); };

        window.onerror = function(msg, url, line) {
          sendToParent('error', ['Erro na linha ' + line + ': ' + msg]);
        };
      })();
    </script>
    `;

    const jsInjections = jsFiles.map(j => `<script>${j.content}</script>`).join("\n");
    if (htmlContent.includes("</body>")) {
      htmlContent = htmlContent.replace("</body>", `${consoleInterceptor}\n${jsInjections}\n</body>`);
    } else {
      htmlContent = `${htmlContent}\n${consoleInterceptor}\n${jsInjections}`;
    }

    return htmlContent;
  };

  // Listen to iframe console messages
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "CONSOLE_LOG") {
        setConsoleLogs(prev => [
          ...prev,
          { type: e.data.logType || "log", msg: e.data.msg || "" }
        ]);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const lineCount = activeFile?.content.split("\n").length || 1;
  const charCount = activeFile?.content.length || 0;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Banner & Filters */}
      <div className="space-y-4">
        {/* Banner */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-[#0b439c]" />
              <h2 className="text-lg font-black text-zinc-900 font-display">Meus Projetos Práticos</h2>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">
              Acompanhe aqui os seus projetos de programação vinculados às trilhas e cursos. Ao clicar em <strong className="text-[#0b439c]">"Abrir meu projeto"</strong>, o ambiente de desenvolvimento de código será aberto para prática.
            </p>
          </div>

          {/* Filter Tabs - Only shown after a track is selected */}
          {selectedTrilhaId && (
            <div className="flex items-center gap-1.5 flex-wrap bg-zinc-100 p-1.5 rounded-xl border border-zinc-200/80">
              <button
                onClick={() => setStatusFilter("todos")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "todos"
                    ? "bg-white text-[#0b439c] shadow-xs border border-zinc-200"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Todos ({trackProjects.length})
              </button>
              <button
                onClick={() => setStatusFilter("em_andamento")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "em_andamento"
                    ? "bg-amber-50 text-amber-800 shadow-xs border border-amber-200"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Em andamento ({trackProjects.filter(p => projectProgress[p.id]?.status === "Em andamento").length})
              </button>
              <button
                onClick={() => setStatusFilter("finalizado")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === "finalizado"
                    ? "bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Finalizados ({trackProjects.filter(p => projectProgress[p.id]?.status === "Finalizado").length})
              </button>
            </div>
          )}
        </div>

        {/* Search & Trilha Filter Controls */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Trilha Filter Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <GraduationCap className="w-4 h-4 text-[#0b439c] shrink-0" />
              <span className="text-xs font-bold text-zinc-700 hidden sm:inline">Trilha de Estudo:</span>
              <select
                value={selectedTrilhaId}
                onChange={(e) => setSelectedTrilhaId && setSelectedTrilhaId(e.target.value)}
                className="bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer min-w-[200px]"
              >
                <option value="">Selecione uma Trilha...</option>
                {trilhas.map((trilha) => (
                  <option key={trilha.id} value={trilha.id}>
                    {trilha.nome_da_trilha}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input by project name or description */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar projetos..."
                className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white text-zinc-900 text-xs font-medium rounded-xl pl-10 pr-9 py-2.5 outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Projects / Prompt State */}
      {!selectedTrilhaId ? (
        <div className="bg-white border border-dashed border-blue-200 rounded-2xl p-12 text-center space-y-3 shadow-xs bg-gradient-to-b from-blue-50/30 to-transparent">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0b439c] flex items-center justify-center mx-auto shadow-xs">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-zinc-800 text-base">Selecione uma Trilha de Estudo</h4>
          <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
            Selecione primeiro uma trilha de estudo para aparecer os projetos.
          </p>
          {trilhas.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              {trilhas.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrilhaId && setSelectedTrilhaId(String(t.id))}
                  className="px-3.5 py-2 bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  {t.nome_da_trilha}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
          <FolderGit2 className="w-12 h-12 text-zinc-300 mx-auto" />
          <h3 className="text-base font-bold text-zinc-800">Nenhum projeto nesta categoria</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            {searchTerm.trim()
              ? `Não encontramos nenhum projeto com "${searchTerm}" nesta trilha.`
              : statusFilter === "todos"
              ? "Esta trilha de estudo ainda não possui projetos cadastrados."
              : `Nenhum projeto com status "${statusFilter.replace("_", " ")}" encontrado.`}
          </p>
          {searchTerm.trim() && (
            <button
              onClick={() => setSearchTerm("")}
              className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer mt-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar Pesquisa
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((proj) => {
            return (
            <div
              key={proj.id}
              className="group bg-white border border-zinc-200 hover:border-blue-400 rounded-2xl p-6 transition-all shadow-xs hover:shadow-md flex flex-col justify-between space-y-5 relative overflow-hidden"
            >
              <div className="space-y-4">
                {/* Top Badge & Status */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg bg-blue-50 text-[#0b439c] border border-blue-100">
                      {proj.courseTag}
                    </span>
                    {/* Status Badge */}
                    {(() => {
                      const st = projectProgress[proj.id]?.status || "Não iniciado";
                      let badgeStyle = "bg-zinc-100 text-zinc-600 border-zinc-200";
                      if (st === "Em andamento") badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                      if (st === "Finalizado") badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      return (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${badgeStyle}`}>
                          ● {st}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                  <h3 className="font-display font-black text-lg text-zinc-900 group-hover:text-[#0b439c] transition-colors">
                    {proj.title}
                  </h3>
                  <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                    {proj.description}
                  </p>
                </div>

                {/* ID EPC do Projeto (se preenchido) */}
                {projectProgress[proj.id]?.id_epc && (
                  <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-bold text-zinc-700 shrink-0">ID EPC:</span>
                      <span className="text-blue-700 font-mono font-bold truncate text-[11px]">
                        {projectProgress[proj.id].id_epc}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Buttons */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end">
                <button
                  onClick={() => handleOpenStudioLink(proj.id)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b439c] hover:bg-blue-800 text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs"
                  title="Abrir estúdio de código do projeto"
                >
                  <span>Abrir meu projeto</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}
        </div>
      )}

      {/* ==================== MODAL DE CÓDIGO (EDITOR COMPLETO) ==================== */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-6">
          <div className="bg-[#0a0e1a] text-zinc-100 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col w-full max-w-6xl h-[92vh] font-sans">
            
            {/* Top Navbar / Toolbar */}
            <div className="bg-[#0f172a] border-b border-zinc-800/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
                  title="Voltar para a lista de projetos"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                  <span>Fechar Editor</span>
                </button>

                <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-xl text-xs">
                  <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wide">
                    {activeProject?.courseTag}
                  </span>
                  <span className="text-zinc-500">&bull;</span>
                  <span className="font-bold text-zinc-200">{activeProject?.title}</span>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Copiado!" : "Copiar"}</span>
                </button>

                <button
                  onClick={() => handleOpenPreview(activeProject.id)}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-900/30 uppercase"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>EXECUTAR</span>
                </button>
              </div>
            </div>

            {/* Main Workspace Area (Sidebar + Editor) */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Sidebar: Arquivos do Projeto */}
              <div className="w-56 sm:w-64 bg-[#0a0e1a] border-r border-zinc-800/80 flex flex-col shrink-0">
                
                <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-blue-400" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                      Arquivos do Projeto
                    </span>
                  </div>
                  <button
                    onClick={() => setIsNewFileModalOpen(true)}
                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Criar novo arquivo"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-2 space-y-1 flex-1 overflow-y-auto">
                  {activeProject?.files.map(file => {
                    const isActive = file.name === activeFileName;
                    return (
                      <div
                        key={file.name}
                        onClick={() => setActiveFileName(file.name)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                          isActive
                            ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-xs"
                            : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode className={`w-4 h-4 shrink-0 ${
                            file.language === "html" ? "text-orange-400" :
                            file.language === "css" ? "text-sky-400" : "text-yellow-400"
                          }`} />
                          <span className="truncate">{file.name}</span>
                        </div>

                        {activeProject.files.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity cursor-pointer"
                            title="Excluir arquivo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/50 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Total: {activeProject?.files.length} arquivo(s)</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Editor Ativo
                  </span>
                </div>
              </div>

              {/* Center/Right: Code Editor Panel */}
              <div className="flex-1 flex flex-col bg-[#070a13] min-w-0">
                
                <div className="bg-[#0f172a] border-b border-zinc-800/80 flex items-center justify-between px-2 overflow-x-auto no-scrollbar shrink-0">
                  <div className="flex items-center">
                    {activeProject?.files.map(file => {
                      const isActive = file.name === activeFileName;
                      return (
                        <button
                          key={file.name}
                          onClick={() => setActiveFileName(file.name)}
                          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-r border-zinc-800 transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#070a13] text-blue-400 border-t-2 border-t-blue-500"
                              : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                          }`}
                        >
                          <Code2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>{file.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono uppercase bg-zinc-800 px-1.5 py-0.5 rounded">
                            {file.language}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 flex overflow-hidden relative">
                  <div className="w-12 bg-[#0a0e1a] text-zinc-600 select-none py-4 text-right pr-3 font-mono text-xs leading-relaxed shrink-0 border-r border-zinc-800/60">
                    {Array.from({ length: lineCount }).map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>

                  <textarea
                    value={activeFile?.content || ""}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escreva seu código HTML, CSS ou JavaScript aqui..."
                    spellCheck={false}
                    className="flex-1 bg-transparent text-zinc-100 font-mono text-xs leading-relaxed p-4 resize-none focus:outline-none selection:bg-blue-600/40 w-full h-full"
                  />
                </div>

                <div className="bg-[#0a0e1a] border-t border-zinc-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] text-zinc-500 font-mono shrink-0">
                  <div className="flex items-center gap-4">
                    <span>{lineCount} linhas</span>
                    <span>{charCount} caracteres</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400 font-bold">UTF-8</span>
                    <span>Pronto para Execução</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EXECUÇÃO AO VIVO (PREVIEW & CONSOLE) ==================== */}
      {isLivePreviewOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#0b0e17] border border-zinc-800 rounded-2xl w-full max-w-5xl h-[90vh] shadow-2xl overflow-hidden flex flex-col">
            
            <div className="p-4 bg-[#111728] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-extrabold text-sm sm:text-base text-white">
                      Executando: {activeProject?.title}
                    </h3>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                      AO VIVO
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Visualizador interativo do projeto index.html
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConsoleLogs([])}
                  className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                  title="Recarregar Execução"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsLivePreviewOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="bg-[#0e1424] border-b border-zinc-800 px-4 py-2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewTab("preview")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    previewTab === "preview"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Pré-visualização</span>
                </button>

                <button
                  onClick={() => setPreviewTab("console")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    previewTab === "console"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Console JS</span>
                  {consoleLogs.length > 0 && (
                    <span className="bg-amber-500 text-zinc-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {consoleLogs.length}
                    </span>
                  )}
                </button>
              </div>

              <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
                HTML5 Sandbox Output
              </span>
            </div>

            <div className="flex-1 bg-white relative overflow-hidden">
              {previewTab === "preview" ? (
                <iframe
                  title="Output Preview"
                  srcDoc={buildIframeSource()}
                  className="w-full h-full border-none bg-white"
                  sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                />
              ) : (
                <div className="w-full h-full bg-[#070a13] text-zinc-100 p-4 font-mono text-xs overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2 text-zinc-400 text-[11px]">
                    <span>Registros do Console do Navegador</span>
                    <button
                      onClick={() => setConsoleLogs([])}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Limpar Logs
                    </button>
                  </div>

                  {consoleLogs.length === 0 ? (
                    <p className="text-zinc-500 italic py-4">Nenhum log registrado ainda. Execute ações na pré-visualização para gerar logs do console.</p>
                  ) : (
                    consoleLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg font-mono text-xs border ${
                          log.type === "error"
                            ? "bg-red-950/40 border-red-800/50 text-red-300"
                            : log.type === "info"
                            ? "bg-blue-950/40 border-blue-800/50 text-blue-300"
                            : "bg-zinc-900 border-zinc-800 text-zinc-200"
                        }`}
                      >
                        <span className="font-bold uppercase text-[10px] opacity-70 mr-2">[{log.type}]</span>
                        {log.msg}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ==================== MODAL: NOVO ARQUIVO ==================== */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1222] border border-zinc-800 rounded-2xl max-w-sm w-full shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="font-display font-extrabold text-white text-sm">Criar Novo Arquivo</h3>
              <button
                onClick={() => setIsNewFileModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Nome do Arquivo (com extensão)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: componente.js ou layout.css"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  className="w-full bg-[#131b31] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 cursor-pointer"
                >
                  Criar Arquivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ENVIAR ID EPC DO PROJETO ==================== */}
      {linkModalProjId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-[#0b439c]" />
                <h3 className="font-display font-black text-zinc-900 text-base">Enviar ID EPC do Projeto</h3>
              </div>
              <button
                onClick={() => setLinkModalProjId(null)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Informe o ID EPC do seu projeto finalizado. Ao enviar o ID EPC, o status do seu projeto será alterado para <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Finalizado</span>.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (linkModalProjId) {
                  handleSaveProjectEpc(linkModalProjId, inputProjectEpc);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  ID EPC
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Informe o ID EPC (ex: EPC-12345)"
                    value={inputProjectEpc}
                    onChange={(e) => setInputProjectEpc(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-600 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLinkModalProjId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 text-zinc-600 hover:bg-zinc-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0b439c] hover:bg-blue-800 text-white cursor-pointer shadow-xs"
                >
                  Salvar e Finalizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
