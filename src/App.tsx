import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { 
  BookOpen, 
  GraduationCap, 
  Award, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Compass, 
  User, 
  Brain, 
  Clock, 
  CheckCircle2, 
  ChevronDown, 
  Play, 
  MessageSquare, 
  Send, 
  Upload, 
  RotateCcw, 
  Bookmark, 
  Search, 
  Code,
  Flame,
  Rocket,
  ArrowLeft,
  ArrowRight,
  X,
  HelpCircle,
  AlertCircle,
  AlertTriangle,
  Lock,
  Mail,
  Eye,
  EyeOff,
  FileText,
  Users,
  UserPlus,
  Layers,
  Settings,
  ClipboardList,
  Shield,
  ShieldAlert,
  Plus,
  Trash2,
  Edit3,
  Filter,
  Calendar,
  Menu,
  LogOut,
  FolderGit2,
  Table,
  LayoutGrid,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Linkedin,
  Github,
  Instagram,
  UserCheck,
  KeyRound,
  ShieldCheck,
  LifeBuoy,
  RefreshCw,
  Tag,
  Printer,
  Download
} from "lucide-react";
import { ProjectsView } from "./components/ProjectsView";
import { TicketDetailView } from "./components/TicketDetailView";
import { TicketPdfView } from "./components/TicketPdfView";
import { TermsOfUseView } from "./components/TermsOfUseView";
import { DocumentosManager } from "./components/DocumentosManager";
import { OcorrenciasManager } from "./components/OcorrenciasManager";
import { TERMS_PLAIN_TEXT_FOR_CLIPBOARD } from "./data/termsOfUse";
import {
  generateTicketPdf,
  openTicketPdfInBrowser,
  extractMatricula,
  generateMatricula,
  formatUserUidWithSixDigits,
  getUserSixDigitSuffix,
  generateUniqueUserUUID,
  matchesUserSearch,
  printTicketsInBrowser,
  openMultipleTicketsPdfInBrowser,
  generateMultipleTicketsPdf
} from "./lib/generateTicketPdf";
import { motion, AnimatePresence } from "motion/react";
import { Course, CourseModule, Lesson, StudentStats, ChatMessage, QuizQuestion, Trilha } from "./types";
import { parseMarkdown, slugifyCourse, slugifyLesson, slugify } from "./utils";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { supabaseAtendimento, isSupabaseAtendimentoConfigured } from "./lib/supabaseAtendimento";
import { scramblePassword, descramblePassword, passwordsMatch } from "./lib/passwordCipher";
import { User as SupabaseUser } from "@supabase/supabase-js";

export interface AtendimentoItem {
  id: string;
  matricula_usuario?: string;
  user_id?: string;
  id_do_usuario?: string;
  nome: string;
  email?: string;
  tipo: "Sugestão" | "Dúvida" | "Reclamação" | "Bloqueio de Conta" | "Problema Técnico" | "Outro" | string;
  mensagem: string;
  status: "Aguardando" | "Em Andamento" | "Concluído" | string;
  resposta?: string;
  mensagem_respondida?: string;
  respondido_por?: string;
  respondido_em?: string;
  criado_em: string;
  atualizado_em?: string;
}

const isValidUUID = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

function getTwoNameInitials(fullName: string): string {
  if (!fullName) return "PC";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0]?.[0] || "U").toUpperCase();
}

function getInitialRouteInfo() {
  if (typeof window === "undefined") {
    return { 
      authMode: "login" as const, 
      activeTab: "dashboard" as const, 
      courseSlug: "",
      lessonSlug: "",
      isViewingCourseInfo: false
    };
  }
  
  let raw = "";
  if (window.location.hash) {
    raw = window.location.hash.replace(/^#\/?/, "").split("?")[0].trim().toLowerCase();
  }
  if (!raw) {
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, "").trim().toLowerCase();
    if (pathname && pathname !== "index.html") {
      raw = pathname;
    }
  }

  const params = new URLSearchParams(window.location.search);
  const qRoute = (params.get("route") || params.get("tab") || params.get("auth") || params.get("p") || "").toLowerCase().trim();
  if (qRoute) {
    raw = qRoute;
  }

  let authMode: "login" | "forgot" = "login";


  let activeTab: "dashboard" | "usuarios" | "atendimento" | "documentos" | "ocorrencias" | "perfil" | "termos" = "dashboard";
  let courseSlug = "";
  let lessonSlug = "";
  let isViewingCourseInfo = false;
  let pdfProtocol = "";
  let detailTicketProtocol = "";

  const segments = raw.split("/").filter(Boolean);
  if (segments.length > 0) {
    const first = segments[0];
    if (first === "perfil" || first === "profile" || first === "meu-perfil") {
      activeTab = "perfil";
    } else if (first === "termos" || first === "termo" || first === "termos-de-uso" || first === "termo-de-uso" || first === "terms" || first === "privacidade") {
      activeTab = "termos";
    } else if (first === "documentos" || first === "documento" || first === "docs") {
      activeTab = "documentos";
    } else if (first === "ocorrencias" || first === "ocorrencia" || first === "seguranca") {
      activeTab = "ocorrencias";
    } else if (first.startsWith("atendimento-") || first.startsWith("central-de-atendimento-")) {
      activeTab = "atendimento";
      const protoPart = first.replace(/^(central-de-)?atendimento-/, "");
      if (protoPart.endsWith("-pdf") || (segments.length >= 2 && (segments[1] === "pdf" || segments[1] === "comprovante"))) {
        const cleanProto = protoPart.replace(/-pdf$/, "");
        pdfProtocol = cleanProto;
        detailTicketProtocol = cleanProto;
      } else {
        detailTicketProtocol = protoPart;
      }
    } else if (first === "atendimento" || first === "central-de-atendimento" || first === "suporte" || first === "ouvidoria" || first === "ajuda") {
      activeTab = "atendimento";
      if (segments.length >= 3 && (segments[2] === "pdf" || segments[2] === "comprovante")) {
        pdfProtocol = segments[1];
        detailTicketProtocol = segments[1];
      } else if (segments.length >= 2 && segments[1].endsWith("-pdf")) {
        const cleanProto = segments[1].replace(/-pdf$/, "");
        pdfProtocol = cleanProto;
        detailTicketProtocol = cleanProto;
      } else if (segments.length >= 2) {
        detailTicketProtocol = segments[1];
      }
    } else if (first === "usuarios" || first === "users" || first === "controle-usuarios") {
      activeTab = "usuarios";
    } else {
      // Qualquer outro link, subcaminho ou parâmetro sempre cai no dashboard (Darkborg)
      activeTab = "dashboard";
    }
  }

  return { authMode, activeTab, courseSlug, lessonSlug, isViewingCourseInfo, pdfProtocol, detailTicketProtocol };
}

export default function App() {
  // Limpeza de qualquer quarentena residual de segurança para acesso livre imediato
  useEffect(() => {
    try {
      localStorage.removeItem("pc_security_quarantine_exp");
      localStorage.removeItem("pc_security_incident_id");
    } catch {}
  }, []);

  const initialRoute = getInitialRouteInfo();

  // Navigation: 'dashboard' | 'usuarios' | 'atendimento' | 'documentos' | 'ocorrencias' | 'perfil' | 'termos' (restrita aos painéis administrativos)
  const [activeTab, setActiveTab] = useState<"dashboard" | "usuarios" | "atendimento" | "documentos" | "ocorrencias" | "perfil" | "termos" | "trilhas" | "courses" | "projects" | "lesson-view" | "cursos_gestao">(initialRoute.activeTab);

  // User Role/Account Type State (Exclusive administrator management panel)
  const [accountType, setAccountType] = useState<"estudante" | "instrutor" | "administrador">("administrador");
  const [authRoleSelected, setAuthRoleSelected] = useState<"estudante" | "instrutor" | "administrador">("administrador");

  // Admin User Creation & Edit States
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCreatingUserPage, setIsCreatingUserPage] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [createUserAdminPassword, setCreateUserAdminPassword] = useState("");
  const [showCreateUserAdminPassword, setShowCreateUserAdminPassword] = useState(false);
  const [newUserRole, setNewUserRole] = useState<"estudante" | "instrutor" | "administrador">("estudante");
  const [newUserStatus, setNewUserStatus] = useState<"Liberado" | "Bloqueado">("Liberado");
  const [newUserMotivo, setNewUserMotivo] = useState("");
  const [isCreatingUserSubmitting, setIsCreatingUserSubmitting] = useState(false);
  const [createUserErrorMsg, setCreateUserErrorMsg] = useState<string | null>(null);
  const [createUserSuccessMsg, setCreateUserSuccessMsg] = useState<string | null>(null);

  // Admin User Editing States
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingUserFromAtendimento, setEditingUserFromAtendimento] = useState(false);
  const [isEditingUserFields, setIsEditingUserFields] = useState(false);
  const [editUserSuccessMsg, setEditUserSuccessMsg] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [showEditUserPassword, setShowEditUserPassword] = useState(false);
  const [editUserRole, setEditUserRole] = useState<"estudante" | "instrutor" | "administrador">("estudante");
  const [editUserStatus, setEditUserStatus] = useState<"Liberado" | "Bloqueado">("Liberado");
  const [editUserMotivo, setEditUserMotivo] = useState("");

  // Painel de Impressão e Exportação em Lote de Atendimentos (Central de Atendimento)
  const [isPrintTicketsBoxOpen, setIsPrintTicketsBoxOpen] = useState(false);
  const [printPeriodMode, setPrintPeriodMode] = useState<"all" | "days">("all");
  const [printDaysCount, setPrintDaysCount] = useState<string>("30");
  const [printUserMode, setPrintUserMode] = useState<"all" | "specific">("all");
  const [printUserSearchQuery, setPrintUserSearchQuery] = useState<string>("");
  const [printSelectedUser, setPrintSelectedUser] = useState<any | null>(null);

  // Estatísticas de Progresso e Conquistas do Usuário Sendo Editado
  const [editingUserStats, setEditingUserStats] = useState<{
    completedLessons: number;
    completedCourses: number;
    completedTrilhas: number;
    loading: boolean;
  }>({ completedLessons: 0, completedCourses: 0, completedTrilhas: 0, loading: false });

  // Full Screen Blocked Account Info State
  const [blockedAccountInfo, setBlockedAccountInfo] = useState<{
    id?: string;
    matricula?: string;
    email?: string;
    name?: string;
    motivo?: string;
  } | null>(null);
  const [blockedViewMode, setBlockedViewMode] = useState<"motivo" | "atendimento" | "detalhes">("motivo");
  const [blockedUserTicket, setBlockedUserTicket] = useState<AtendimentoItem | null>(null);
  const [loadingBlockedTicket, setLoadingBlockedTicket] = useState(false);

  // Estados para Ouvidoria / Central de Atendimento e Recursos (Apelação de Bloqueio)
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [appealExplanation, setAppealExplanation] = useState("");
  const [appealSending, setAppealSending] = useState(false);
  const [appealSentSuccess, setAppealSentSuccess] = useState(false);
  const [appealProtocol, setAppealProtocol] = useState<string | null>(null);
  const [appealError, setAppealError] = useState<string | null>(null);

  // Admin User Deletion Confirmation States
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [deleteAdminPassword, setDeleteAdminPassword] = useState("");
  const [showDeleteAdminPassword, setShowDeleteAdminPassword] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState("");
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Admin Course Management & Creation States
  const [adminCourseSearch, setAdminCourseSearch] = useState("");
  const [adminCourseViewMode, setAdminCourseViewMode] = useState<"table" | "cards">("cards");
  const [isCreateCourseModalOpen, setIsCreateCourseModalOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDescription, setNewCourseDescription] = useState("");
  const [newCourseCategory, setNewCourseCategory] = useState("");
  const [newCourseLessons, setNewCourseLessons] = useState("");
  const [newCourseInstructor, setNewCourseInstructor] = useState("");
  const [newCourseGradientColor, setNewCourseGradientColor] = useState("#ADD8E6, #000084");
  const [newCourseVisibility, setNewCourseVisibility] = useState<"Público" | "Privado" | "Rascunho">("Público");

  // Admin & Instructor Course Deletion Confirmation States
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleteCoursePassword, setDeleteCoursePassword] = useState("");
  const [showDeleteCoursePassword, setShowDeleteCoursePassword] = useState(false);
  const [deleteCourseErrorMsg, setDeleteCourseErrorMsg] = useState("");
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  // Course Editing States
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCourseTitle, setEditCourseTitle] = useState("");
  const [editCourseDescription, setEditCourseDescription] = useState("");
  const [editCourseCategory, setEditCourseCategory] = useState("");
  const [editCourseInstructor, setEditCourseInstructor] = useState("");
  const [editCourseGradientColor, setEditCourseGradientColor] = useState("#ADD8E6, #000084");
  const [editCourseVisibility, setEditCourseVisibility] = useState<"Público" | "Privado" | "Rascunho">("Público");

  // Add Module / Lesson Modal States
  const [moduleLessonCourse, setModuleLessonCourse] = useState<Course | null>(null);
  const [addModuleTitle, setAddModuleTitle] = useState("");
  const [addLessonTitle, setAddLessonTitle] = useState("");
  const [addLessonContent, setAddLessonContent] = useState("");
  const [selectedTargetModuleIndex, setSelectedTargetModuleIndex] = useState<number>(0);
  const [addType, setAddType] = useState<"module" | "lesson">("module");

  // Admin and Instructor Data States
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [classes, setClasses] = useState<any[]>([]);

  // Supabase Auth and Sync States
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "forgot">("login");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginEmailNotRegistered, setLoginEmailNotRegistered] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Password Reset States (via programacerto.suporte@gmail.com)
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotTimer, setForgotTimer] = useState<number>(0);
  const [emailNotRegistered, setEmailNotRegistered] = useState(false);

  // Account Deletion States (com confirmação por e-mail de segurança)
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [deleteAccountStep, setDeleteAccountStep] = useState<1 | 2 | 3>(1); // 1 = confirmação e envio, 2 = digitação do código, 3 = mensagem de sucesso final
  const [deleteAccountCode, setDeleteAccountCode] = useState("");
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [deleteAccountSuccess, setDeleteAccountSuccess] = useState<string | null>(null);
  const [deleteAccountTimer, setDeleteAccountTimer] = useState<number>(0);

  // Timer para expiração do código de exclusão de conta (15 minutos = 900s)
  useEffect(() => {
    let interval: any = null;
    if (deleteAccountTimer > 0) {
      interval = setInterval(() => {
        setDeleteAccountTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [deleteAccountTimer]);

  // Estados para Edição de Dados no Perfil (com Verificação de Segurança Obrigatória para E-mail e Senha)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileEmail, setEditProfileEmail] = useState("");
  const [editProfilePassword, setEditProfilePassword] = useState("");
  const [showEditProfilePassword, setShowEditProfilePassword] = useState(false);
  const [profileUpdateSuccessMsg, setProfileUpdateSuccessMsg] = useState<string | null>(null);
  const [profileUpdateErrorMsg, setProfileUpdateErrorMsg] = useState<string | null>(null);

  // Modal de Verificação de Segurança Obrigatória para Alteração de E-mail/Senha
  const [isProfileSecurityModalOpen, setIsProfileSecurityModalOpen] = useState(false);
  const [profileSecurityCode, setProfileSecurityCode] = useState("");
  const [profileSecurityLoading, setProfileSecurityLoading] = useState(false);
  const [profileSecurityError, setProfileSecurityError] = useState<string | null>(null);
  const [profileSecurityTimer, setProfileSecurityTimer] = useState<number>(0);
  const [pendingProfileChanges, setPendingProfileChanges] = useState<{
    name: string;
    email: string;
    password?: string;
  } | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (profileSecurityTimer > 0) {
      interval = setInterval(() => {
        setProfileSecurityTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [profileSecurityTimer]);

  
  // Trilhas states
  const [trilhas, setTrilhas] = useState<Trilha[]>(() => {
    try {
      const cached = localStorage.getItem("aluradev_trilhas_cache");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [selectedTrilhaId, setSelectedTrilhaId] = useState<number | string>("");
  const [accountCreatedAt] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("account_created_at");
      if (saved) return saved;
      const now = new Date().toISOString();
      localStorage.setItem("account_created_at", now);
      return now;
    } catch {
      return new Date().toISOString();
    }
  });

  const getAccountCreationDateDisplay = () => {
    try {
      const rawDate = user?.created_at || accountCreatedAt;
      if (!rawDate) return "04/09/2026";
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return "04/09/2026";
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
    } catch {
      return "04/09/2026";
    }
  };
  const [trilhaSearchTerm, setTrilhaSearchTerm] = useState("");
  const [trilhaStatusFilter, setTrilhaStatusFilter] = useState<"todos" | "em_andamento" | "finalizado">("todos");

  // Enrolled trilhas ("Meus Estudos")
  const [enrolledTrilhaIds, setEnrolledTrilhaIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("aluradev_enrolled_trilhas");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.map(String);
      }
    } catch (e) {}
    return [];
  });
  const [isAddTrilhaModalOpen, setIsAddTrilhaModalOpen] = useState(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState("");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("Todas as Categorias");
  const [enrollSuccessMessage, setEnrollSuccessMessage] = useState<string | null>(null);

  // Modais de Confirmação com Camadas de Alta Prioridade (Priority Overlays)
  const [enrollModalTrilha, setEnrollModalTrilha] = useState<{
    id: string | number;
    name: string;
    description?: string;
    totalCourses?: number;
  } | null>(null);

  const [unenrollModalTrilha, setUnenrollModalTrilha] = useState<{
    id: string | number;
    name: string;
  } | null>(null);

  // Target route reference for deep linking across async course loads and auth flows
  const targetRouteRef = useRef<any>(
    initialRoute.courseSlug ? initialRoute : null
  );

  // Courses states
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const cached = localStorage.getItem("aluradev_courses_cache");
      if (cached) return JSON.parse(cached);
      const storedCustom = localStorage.getItem("aluradev_custom_courses");
      if (storedCustom) return JSON.parse(storedCustom);
    } catch (e) {}
    return [];
  });
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number>(0);
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<number>(0);
  const [courseSearchTerm, setCourseSearchTerm] = useState("");
  const [selectedCourseCategory, setSelectedCourseCategory] = useState("Todas");
  const [isViewingCourseInfo, setIsViewingCourseInfo] = useState<boolean>(initialRoute.isViewingCourseInfo);
  const [courseInfoSourceTab, setCourseInfoSourceTab] = useState<"courses" | "cursos_gestao" | "dashboard">("courses");
  const [editingLesson, setEditingLesson] = useState<{
    courseId: string;
    moduleIndex: number;
    lessonIndex: number;
    title: string;
    content: string;
  } | null>(null);
  
  // Custom course generation form
  const [customTopic, setCustomTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState(false);

  // Profile / Settings
  const [studentName, setStudentName] = useState(() => {
    try {
      const savedStats = localStorage.getItem("aluradev_student_stats");
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        if (parsed.name) return parsed.name;
      }
    } catch (e) {}
    return "Estudante";
  });
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [termsCopied, setTermsCopied] = useState(false);

  // Estados de Aceite de Termos de Uso no Cadastro e Avisos de Cópia em Aula
  const [termsAcceptedForSignup, setTermsAcceptedForSignup] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [termsModalInitialTab, setTermsModalInitialTab] = useState<"termos" | "privacidade">("termos");
  const [lessonCopyWarning, setLessonCopyWarning] = useState<string | null>(null);

  // Estados da Central de Atendimento (Suporte, Sugestões, Dúvidas e Recursos)
  const [tickets, setTickets] = useState<AtendimentoItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isCreatingNewTicket, setIsCreatingNewTicket] = useState(false);
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState<AtendimentoItem | null>(null);
  const [viewingTicketDetailProtocol, setViewingTicketDetailProtocol] = useState<string | null>(initialRoute.detailTicketProtocol || null);
  const [viewingTicketPdfProtocol, setViewingTicketPdfProtocol] = useState<string | null>(initialRoute.pdfProtocol || null);

  // Efeito para sincronizar selectedTicketForDetail caso o usuário acerte a rota diretamente por URL
  useEffect(() => {
    if (viewingTicketDetailProtocol && !selectedTicketForDetail) {
      const match = tickets.find(t => 
        t.id.toLowerCase() === viewingTicketDetailProtocol.toLowerCase() ||
        t.id.toLowerCase().replace("#", "") === viewingTicketDetailProtocol.toLowerCase().replace("#", "") ||
        t.id.toLowerCase().replace("atend-", "") === viewingTicketDetailProtocol.toLowerCase().replace("atend-", "")
      );
      if (match) {
        setSelectedTicketForDetail(match);
      } else {
        try {
          const stored = localStorage.getItem("programacerto_atendimentos");
          if (stored) {
            const list: AtendimentoItem[] = JSON.parse(stored);
            const found = list.find(t => 
              t.id.toLowerCase() === viewingTicketDetailProtocol.toLowerCase() ||
              t.id.toLowerCase().replace("#", "") === viewingTicketDetailProtocol.toLowerCase().replace("#", "") ||
              t.id.toLowerCase().replace("atend-", "") === viewingTicketDetailProtocol.toLowerCase().replace("atend-", "")
            );
            if (found) setSelectedTicketForDetail(found);
          }
        } catch {}
      }
    }
  }, [viewingTicketDetailProtocol, tickets, selectedTicketForDetail]);
  const [ticketType, setTicketType] = useState<"Sugestão" | "Dúvida" | "Reclamação" | "Bloqueio de Conta" | "Problema Técnico" | "Outro">("Dúvida");
  const [ticketCustomType, setTicketCustomType] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSending, setTicketSending] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<"Todos" | "Aguardando" | "Em Andamento" | "Concluído">("Todos");
  const [ticketCategoryFilter, setTicketCategoryFilter] = useState<string>("Bloqueio de Conta");
  const [ticketBlockSubFilter, setTicketBlockSubFilter] = useState<"todos_bloqueios" | "bloqueados" | "liberados">("todos_bloqueios");
  const [adminViewAllTickets, setAdminViewAllTickets] = useState(true);
  const [ticketSearchTerm, setTicketSearchTerm] = useState("");

  // Estados de Resposta da Equipe/Administrador
  const [ticketToRespond, setTicketToRespond] = useState<AtendimentoItem | null>(null);
  const [adminResponseText, setAdminResponseText] = useState("");
  const [adminStatusChange, setAdminStatusChange] = useState<"Aguardando" | "Em Andamento" | "Concluído">("Concluído");
  const [adminSavingResponse, setAdminSavingResponse] = useState(false);
  const [adminRespondError, setAdminRespondError] = useState<string | null>(null);

  // Cliente dedicado para o projeto separado de Central de Atendimento (com fallback gracioso)
  const getAtendimentoClient = useCallback(() => {
    if (supabaseAtendimento && isSupabaseAtendimentoConfigured) {
      return supabaseAtendimento;
    }
    if (supabase && isSupabaseConfigured) {
      return supabase;
    }
    return null;
  }, []);

  // Carregar atendimentos do Supabase e sincronizar com localStorage
  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      let fetched: AtendimentoItem[] = [];
      let loadedFromDb = false;

      const client = getAtendimentoClient();
      if (client) {
        try {
          const { data, error } = await client
            .from("atendimentos")
            .select("*")
            .order("criado_em", { ascending: false });
          if (!error && Array.isArray(data)) {
            // Resolver emails e matrículas da tabela usuarios para garantir que o solicitante tenha nome, email e matrícula
            const emailMap = new Map<string, string>();
            const matriculaMap = new Map<string, string>();
            try {
              const { data: dbUsers } = await supabase
                .from("usuarios")
                .select("*");
              if (dbUsers && Array.isArray(dbUsers)) {
                dbUsers.forEach((u: any) => {
                  const uKey = String(u.matricula || u.id || "").trim();
                  const uMat = extractMatricula(uKey);
                  if (uKey && u.email) emailMap.set(uKey, u.email);
                  if (uMat && u.email) emailMap.set(uMat, u.email);
                  if (u.nome && u.email) emailMap.set(u.nome.toLowerCase().trim(), u.email);
                  if (uKey && uMat) matriculaMap.set(uKey, uMat);
                  if (u.nome && uMat) matriculaMap.set(u.nome.toLowerCase().trim(), uMat);
                  if (u.email && uMat) matriculaMap.set(u.email.toLowerCase().trim(), uMat);
                });
              }
            } catch (uErr) {
              console.warn("Aviso ao buscar emails/matrículas para atendimentos:", uErr);
            }

            fetched = data.map((row: any) => {
              const rawMatOrId = String(row.matricula_usuario || row.user_id || row.id_do_usuario || "").trim();
              const uName = row.nome || "Usuário";
              const resolvedEmail = row.email || 
                emailMap.get(rawMatOrId) || 
                emailMap.get(extractMatricula(rawMatOrId)) ||
                emailMap.get(uName.toLowerCase().trim()) || 
                (user && (user.id === rawMatOrId || user.user_metadata?.nome === uName) ? user.email : "");
              const resolvedMat =
                (row.matricula_usuario ? extractMatricula(row.matricula_usuario) : "") ||
                matriculaMap.get(rawMatOrId) ||
                (resolvedEmail ? matriculaMap.get(resolvedEmail.toLowerCase().trim()) : "") ||
                matriculaMap.get(uName.toLowerCase().trim()) ||
                (rawMatOrId ? extractMatricula(rawMatOrId) : "");

              return {
                id: String(row.id),
                matricula_usuario: resolvedMat || rawMatOrId,
                user_id: resolvedMat || rawMatOrId,
                id_do_usuario: resolvedMat || rawMatOrId,
                nome: uName,
                email: resolvedEmail,
                tipo: row.tipo || "Geral",
                mensagem: row.mensagem || "",
                status: row.status === "Pendente" ? "Aguardando" : (row.status || "Aguardando"),
                resposta: row.resposta || row.mensagem_respondida || "",
                mensagem_respondida: row.mensagem_respondida || row.resposta || "",
                respondido_por: row.respondido_por || "",
                respondido_em: row.respondido_em || null,
                criado_em: row.criado_em || new Date().toISOString(),
                atualizado_em: row.atualizado_em || row.criado_em || new Date().toISOString()
              };
            });
            loadedFromDb = true;
          }
        } catch (dbErr) {
          console.warn("Tabela atendimentos no banco ainda não criada, usando armazenamento local:", dbErr);
        }
      }

      // Remover qualquer resíduo de recursos de bloqueio do localStorage
      try {
        localStorage.removeItem("programacerto_recursos");
      } catch (e) {}

      if (loadedFromDb) {
        // Se carregou do banco de dados, o banco é a fonte autoritativa da verdade.
        // Sincronizar localStorage removendo itens que já foram apagados no banco
        try {
          const localTickets: AtendimentoItem[] = JSON.parse(localStorage.getItem("programacerto_atendimentos") || "[]");
          const updatedLocal = localTickets.filter(lt => lt.tipo !== "Bloqueio de Conta" && fetched.some(ft => ft.id === lt.id));
          localStorage.setItem("programacerto_atendimentos", JSON.stringify(updatedLocal));
        } catch (e) {}
      } else {
        try {
          const localTickets: AtendimentoItem[] = JSON.parse(localStorage.getItem("programacerto_atendimentos") || "[]");
          fetched = localTickets.filter(lt => lt.tipo !== "Bloqueio de Conta");
        } catch (e) {}
      }

      fetched.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
      setTickets(fetched);
    } catch (err) {
      console.error("Erro ao carregar atendimentos:", err);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  // Monitorar mudança de tab para carregar atendimentos
  useEffect(() => {
    if (activeTab === "atendimento") {
      loadTickets();
    }
  }, [activeTab, loadTickets]);

  // Buscar atendimento existente para usuário com conta bloqueada EXCLUSIVAMENTE pelo banco de dados (sem localStorage)
  const loadBlockedUserTicket = useCallback(async (accountInfo: { id?: string; matricula?: string; email?: string; name?: string } | null) => {
    if (!accountInfo) {
      setBlockedUserTicket(null);
      return;
    }
    setLoadingBlockedTicket(true);
    try {
      // Limpeza imediata de resíduos de localStorage para evitar ressuscitar chamados apagados
      try {
        localStorage.removeItem("programacerto_recursos");
        const storedAtend = localStorage.getItem("programacerto_atendimentos");
        if (storedAtend) {
          const list: AtendimentoItem[] = JSON.parse(storedAtend);
          const filtered = list.filter((t: any) => t.tipo !== "Bloqueio de Conta");
          localStorage.setItem("programacerto_atendimentos", JSON.stringify(filtered));
        }
      } catch (e) {}

      // Consultar DIRETAMENTE a tabela atendimentos no Supabase
      const client = getAtendimentoClient();
      if (!client) {
        setBlockedUserTicket(null);
        return;
      }

      let matchedRow: any = null;
      const targetMat = accountInfo.matricula || (accountInfo.id ? extractMatricula(accountInfo.id) : "");
      const targetId = accountInfo.id;
      const targetName = accountInfo.name?.trim();

      // 1. Consultar por matricula_usuario e tipo "Bloqueio de Conta"
      if (targetMat) {
        const { data, error } = await client
          .from("atendimentos")
          .select("*")
          .eq("matricula_usuario", targetMat)
          .eq("tipo", "Bloqueio de Conta")
          .order("criado_em", { ascending: false })
          .limit(1);

        if (!error && Array.isArray(data) && data.length > 0) {
          matchedRow = data[0];
        }
      }

      // 2. Fallback: consultar por id_do_usuario se não encontrou por matricula_usuario
      if (!matchedRow && targetId) {
        const { data, error } = await client
          .from("atendimentos")
          .select("*")
          .eq("id_do_usuario", targetId)
          .eq("tipo", "Bloqueio de Conta")
          .order("criado_em", { ascending: false })
          .limit(1);

        if (!error && Array.isArray(data) && data.length > 0) {
          matchedRow = data[0];
        }
      }

      // 3. Se não encontrou e houver nome do usuário, consultar por nome e tipo "Bloqueio de Conta"
      if (!matchedRow && targetName) {
        const { data, error } = await client
          .from("atendimentos")
          .select("*")
          .eq("nome", targetName)
          .eq("tipo", "Bloqueio de Conta")
          .order("criado_em", { ascending: false })
          .limit(1);

        if (!error && Array.isArray(data) && data.length > 0) {
          matchedRow = data[0];
        }
      }

      if (matchedRow) {
        const resolvedMat = matchedRow.matricula_usuario || matchedRow.id_do_usuario || targetMat || accountInfo.id || "";
        const foundTicket: AtendimentoItem = {
          id: String(matchedRow.id),
          matricula_usuario: extractMatricula(resolvedMat),
          user_id: resolvedMat,
          id_do_usuario: resolvedMat,
          nome: matchedRow.nome || accountInfo.name || "Usuário",
          email: matchedRow.email || accountInfo.email || "",
          tipo: "Bloqueio de Conta",
          mensagem: matchedRow.mensagem || "",
          status: matchedRow.status === "Pendente" ? "Aguardando" : (matchedRow.status || "Aguardando"),
          resposta: matchedRow.mensagem_respondida || "",
          mensagem_respondida: matchedRow.mensagem_respondida || "",
          respondido_por: "",
          respondido_em: matchedRow.respondido_em || null,
          criado_em: matchedRow.criado_em || new Date().toISOString(),
          atualizado_em: matchedRow.criado_em || new Date().toISOString()
        };
        setBlockedUserTicket(foundTicket);
      } else {
        // Se foi apagado no Supabase ou não existe, deve ser nulo imediatamente!
        setBlockedUserTicket(null);
      }
    } catch (err) {
      console.error("Erro ao buscar atendimento do usuário bloqueado no banco:", err);
      setBlockedUserTicket(null);
    } finally {
      setLoadingBlockedTicket(false);
    }
  }, [getAtendimentoClient]);

  // Sincronizar busca do chamado do usuário bloqueado sempre que os dados de bloqueio forem alterados ou voltar para o aviso
  useEffect(() => {
    if (blockedAccountInfo && (blockedViewMode === "motivo" || blockedViewMode === "detalhes")) {
      loadBlockedUserTicket(blockedAccountInfo);
    } else if (!blockedAccountInfo) {
      setBlockedUserTicket(null);
    }
  }, [blockedAccountInfo, blockedViewMode, loadBlockedUserTicket]);

  // Criar novo atendimento
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketType === "Outro" && !ticketCustomType.trim()) {
      setTicketError("Por favor, digite o tipo de atendimento na caixa informada.");
      return;
    }
    if (!ticketMessage.trim()) {
      setTicketError("Por favor, digite a descrição do seu atendimento.");
      return;
    }
    setTicketSending(true);
    setTicketError(null);

    const ticketId = `ATEND-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const currentUserName = studentName || user?.user_metadata?.nome || user?.email?.split("@")[0] || "Estudante";
    const currentUserId = (user as any)?.matricula || user?.id || (typeof window !== "undefined" ? localStorage.getItem("aluradev_temp_user_id") : null) || `usr-${Date.now()}`;
    const currentUserMatricula = extractMatricula(currentUserId, allUsers);
    const currentUserEmail = user?.email || "";

    const finalTipo = ticketType === "Outro"
      ? (ticketCustomType.trim() ? `Outro: ${ticketCustomType.trim()}` : "Outro")
      : ticketType;

    const newTicket: AtendimentoItem = {
      id: ticketId,
      matricula_usuario: currentUserMatricula,
      user_id: currentUserMatricula,
      id_do_usuario: currentUserMatricula,
      nome: currentUserName,
      email: currentUserEmail,
      tipo: finalTipo,
      mensagem: ticketMessage.trim(),
      status: "Aguardando",
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    };

    try {
      const client = getAtendimentoClient();
      if (client) {
        try {
          const { error: insErr } = await client.from("atendimentos").insert({
            id: newTicket.id,
            matricula_usuario: currentUserMatricula,
            nome: newTicket.nome,
            email: newTicket.email,
            tipo: newTicket.tipo,
            mensagem: newTicket.mensagem,
            status: newTicket.status,
            criado_em: newTicket.criado_em
          });
          if (insErr) {
            const validUserId = isValidUUID(currentUserId) ? currentUserId : null;
            await client.from("atendimentos").insert({
              id: newTicket.id,
              id_do_usuario: validUserId,
              nome: newTicket.nome,
              tipo: newTicket.tipo,
              mensagem: newTicket.mensagem,
              status: newTicket.status,
              criado_em: newTicket.criado_em
            });
          }
        } catch (dbErr) {
          console.warn("Aviso ao inserir no Supabase (fallback local ativo):", dbErr);
        }
      }

      // Salvar localmente
      const existing: AtendimentoItem[] = JSON.parse(localStorage.getItem("programacerto_atendimentos") || "[]");
      existing.unshift(newTicket);
      localStorage.setItem("programacerto_atendimentos", JSON.stringify(existing));

      setTickets((prev) => [newTicket, ...prev]);
      setTicketMessage("");
      setTicketType("Dúvida");
      setTicketCustomType("");
      setIsNewTicketModalOpen(false);
      setIsCreatingNewTicket(false);
      scrollToTop();
      setTicketSuccess("Atendimento registrado com sucesso! Nossa equipe analisará e retornará por aqui.");
      setTimeout(() => setTicketSuccess(null), 6000);
    } catch (err: any) {
      setTicketError(err?.message || "Erro ao registrar atendimento. Tente novamente.");
    } finally {
      setTicketSending(false);
    }
  };

  // Salvar resposta oficial diretamente pela tela do atendimento (conclusão automática)
  const handleSaveInlineResponse = async (ticketId: string, responseText: string, shouldUnblock: boolean = false) => {
    const now = new Date().toISOString();
    const responderName = studentName || user?.user_metadata?.nome || "Equipe Programa Certo";
    const status = "Concluído";
    const cleanTicketId = ticketId.replace(/^#/, "").trim();

    const targetTicket =
      tickets.find(t => t.id === ticketId || t.id.replace(/^#/, "").trim() === cleanTicketId) ||
      (selectedTicketForDetail && (selectedTicketForDetail.id === ticketId || selectedTicketForDetail.id.replace(/^#/, "").trim() === cleanTicketId)
        ? selectedTicketForDetail
        : undefined);

    // 1. Atualizar na tabela atendimentos do Supabase (usando exclusivamente as colunas reais da tabela: mensagem_respondida, respondido_em, status)
    const client = getAtendimentoClient();
    if (client) {
      const { error: updateAtendErr } = await client
        .from("atendimentos")
        .update({
          mensagem_respondida: responseText,
          respondido_em: now,
          status: status
        })
        .eq("id", cleanTicketId);

      if (updateAtendErr) {
        console.error("Erro ao atualizar atendimento no Supabase:", updateAtendErr);
        throw new Error(updateAtendErr.message || "Não foi possível gravar a conclusão do atendimento no banco de dados.");
      }
    }

    // 2. Se for apelação de bloqueio e admin marcou para desbloquear (usando as colunas reais da tabela usuarios: matricula, acesso, motivo)
    if (shouldUnblock && targetTicket && supabase) {
      const rawUserMatOrId = targetTicket.matricula_usuario || targetTicket.user_id || targetTicket.id_do_usuario || "";
      const rawUserEmail = targetTicket.email?.toLowerCase().trim() || "";
      const rawUserName = targetTicket.nome?.trim() || "";

      const matchedUser = allUsers.find(u =>
        (rawUserMatOrId && (u.matricula === rawUserMatOrId || u.id === rawUserMatOrId || extractMatricula(u.matricula || u.id, allUsers) === extractMatricula(rawUserMatOrId, allUsers))) ||
        (rawUserEmail && u.email && u.email.toLowerCase().trim() === rawUserEmail) ||
        (rawUserName && (u.nome || u.name || "").toLowerCase().trim() === rawUserName.toLowerCase())
      );

      const finalUserMat = matchedUser?.matricula || matchedUser?.id || rawUserMatOrId;
      const finalUserEmail = rawUserEmail || (matchedUser?.email ? matchedUser.email.toLowerCase().trim() : "");

      try {
        if (finalUserMat) {
          const { error: errByMat } = await supabase
            .from("usuarios")
            .update({ acesso: "Liberado", motivo: null })
            .eq("matricula", finalUserMat);
          if (errByMat && isValidUUID(finalUserMat)) {
            await supabase
              .from("usuarios")
              .update({ acesso: "Liberado", motivo: null })
              .eq("id", finalUserMat);
          }
        }
        if (finalUserEmail) {
          const { error: errByEmail } = await supabase
            .from("usuarios")
            .update({ acesso: "Liberado", motivo: null })
            .eq("email", finalUserEmail);
          if (errByEmail) {
            console.error("Erro ao desbloquear usuário por e-mail:", errByEmail);
          }
        }
        if (!finalUserMat && !finalUserEmail && rawUserName) {
          const { error: errByName } = await supabase
            .from("usuarios")
            .update({ acesso: "Liberado", motivo: null })
            .eq("nome", rawUserName);
          if (errByName) {
            console.error("Erro ao desbloquear usuário por nome:", errByName);
          }
        }

        setAllUsers(prev => prev.map(u => {
          if (
            (finalUserMat && (u.matricula === finalUserMat || u.id === finalUserMat)) ||
            (finalUserEmail && u.email?.toLowerCase().trim() === finalUserEmail) ||
            (!finalUserMat && !finalUserEmail && rawUserName && (u.nome || u.name || "").toLowerCase().trim() === rawUserName.toLowerCase())
          ) {
            return { ...u, acesso: "Liberado", status: "Liberado", status_da_conta: "Liberado", motivo: null };
          }
          return u;
        }));
      } catch (unblockErr) {
        console.error("Erro ao desbloquear aluno automaticamente:", unblockErr);
      }
    }

    // 3. Atualizar no localStorage
    const existing: AtendimentoItem[] = JSON.parse(localStorage.getItem("programacerto_atendimentos") || "[]");
    const updated = existing.map((t) => {
      if (t.id === ticketId || t.id.replace(/^#/, "").trim() === cleanTicketId) {
        return {
          ...t,
          resposta: responseText,
          mensagem_respondida: responseText,
          respondido_por: responderName,
          respondido_em: now,
          status: status,
          atualizado_em: now
        };
      }
      return t;
    });
    localStorage.setItem("programacerto_atendimentos", JSON.stringify(updated));

    // 4. Atualizar no estado local
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId || t.id.replace(/^#/, "").trim() === cleanTicketId
          ? {
              ...t,
              resposta: responseText,
              mensagem_respondida: responseText,
              respondido_por: responderName,
              respondido_em: now,
              status: status,
              atualizado_em: now
            }
          : t
      )
    );

    if (selectedTicketForDetail && (selectedTicketForDetail.id === ticketId || selectedTicketForDetail.id.replace(/^#/, "").trim() === cleanTicketId)) {
      setSelectedTicketForDetail(prev => prev ? {
        ...prev,
        resposta: responseText,
        mensagem_respondida: responseText,
        respondido_por: responderName,
        respondido_em: now,
        status: status,
        atualizado_em: now
      } : null);
    }

    setTicketSuccess("Resposta oficial enviada e atendimento concluído com sucesso!");
    setTimeout(() => setTicketSuccess(null), 5000);
    scrollToTop();
  };

  // Alterar bloqueio/liberação do aluno a partir da Central de Atendimento
  const handleToggleUserBlockFromTicket = async (targetIdOrEmail: string, newStatus: "Liberado" | "Bloqueado", motivo: string = "") => {
    const isEmail = targetIdOrEmail.includes("@");
    const isUUID = isValidUUID(targetIdOrEmail);
    try {
      if (supabase) {
        if (isEmail) {
          const { error } = await supabase.from("usuarios").update({
            acesso: newStatus,
            motivo: newStatus === "Bloqueado" ? (motivo || "Bloqueado administrativamente.") : null
          }).eq("email", targetIdOrEmail.toLowerCase().trim());
          if (error) throw error;
        } else {
          const { error: matErr } = await supabase.from("usuarios").update({
            acesso: newStatus,
            motivo: newStatus === "Bloqueado" ? (motivo || "Bloqueado administrativamente.") : null
          }).eq("matricula", targetIdOrEmail.trim());
          if (matErr && isUUID) {
            const { error: idErr } = await supabase.from("usuarios").update({
              acesso: newStatus,
              motivo: newStatus === "Bloqueado" ? (motivo || "Bloqueado administrativamente.") : null
            }).eq("id", targetIdOrEmail.trim());
            if (idErr) throw idErr;
          }
        }
      }

      setAllUsers((prev) =>
        prev.map((u) => {
          if (
            u.matricula === targetIdOrEmail ||
            u.id === targetIdOrEmail ||
            (u.email && u.email.toLowerCase() === targetIdOrEmail.toLowerCase())
          ) {
            return {
              ...u,
              acesso: newStatus,
              status: newStatus,
              status_da_conta: newStatus,
              motivo: newStatus === "Bloqueado" ? (motivo || "Bloqueado administrativamente.") : null
            };
          }
          return u;
        })
      );
    } catch (err) {
      console.error("Erro ao alterar bloqueio de usuário:", err);
      throw err;
    }
  };

  const handleCopyTerms = () => {
    navigator.clipboard.writeText(TERMS_PLAIN_TEXT_FOR_CLIPBOARD).then(() => {
      setTermsCopied(true);
      setTimeout(() => setTermsCopied(false), 2500);
    }).catch((err) => {
      console.error("Erro ao copiar termo de uso:", err);
    });
  };

  // Função utilitária para rolar a tela e containers principais até o topo absoluto
  const scrollToTop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const mainScrollContainer = document.getElementById("main-scroll-container");
      if (mainScrollContainer) mainScrollContainer.scrollTop = 0;
      const mainContainer = document.querySelector("main");
      if (mainContainer) mainContainer.scrollTop = 0;
      const rootElement = document.getElementById("root");
      if (rootElement) rootElement.scrollTop = 0;
    }
  }, []);

  // Garante que toda transição de tela, página, curso, aula ou modo de auth vá sempre para o topo
  useEffect(() => {
    scrollToTop();
  }, [
    activeTab,
    authMode,
    user?.id,
    isGuest,
    selectedCourse?.id,
    selectedLessonIndex,
    selectedModuleIndex,
    isViewingCourseInfo,
    selectedTicketForDetail?.id,
    viewingTicketDetailProtocol,
    viewingTicketPdfProtocol,
    scrollToTop
  ]);

  // Transição limpa entre abas com reset de telas secundárias de atendimento e rolagem ao topo
  const navigateToTab = useCallback((tab: any) => {
    setSelectedTicketForDetail(null);
    setViewingTicketDetailProtocol(null);
    setViewingTicketPdfProtocol(null);
    setEditingUser(null);
    setEditingUserFromAtendimento(false);
    setIsCreatingUserPage(false);
    setActiveTab(tab);
    scrollToTop();
  }, [scrollToTop]);

  const [isMobileLessonDrawerOpen, setIsMobileLessonDrawerOpen] = useState(false);
  const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);
  const [instructorPhotoUrl, setInstructorPhotoUrl] = useState<string | null>(null);

  // Fetch instructor photo_perfil_url strictly from Supabase 'perfis' table
  useEffect(() => {
    async function fetchInstructorPhoto() {
      if (!selectedCourse?.instructor) {
        setInstructorPhotoUrl(null);
        return;
      }
      const instructorName = selectedCourse.instructor.trim();
      if (isSupabaseConfigured && supabase) {
        try {
          // 1. Check 'perfis' table for matching record with foto_perfil_url
          const { data: perfisList } = await supabase
            .from("perfis")
            .select("foto_perfil_url, name, nome");

          if (perfisList && perfisList.length > 0) {
            const matchedProfile = perfisList.find((p: any) => {
              const pName = (p.name || p.nome || "").toLowerCase().trim();
              const targetName = instructorName.toLowerCase().trim();
              return pName === targetName || pName.includes(targetName) || targetName.includes(pName);
            });

            if (matchedProfile?.foto_perfil_url) {
              setInstructorPhotoUrl(matchedProfile.foto_perfil_url);
              return;
            }
          }

          // 2. Direct ilike query on 'perfis' table
          const { data: directProfile } = await supabase
            .from("perfis")
            .select("foto_perfil_url")
            .or(`name.ilike.%${instructorName}%,nome.ilike.%${instructorName}%`)
            .limit(1)
            .maybeSingle();

          if (directProfile?.foto_perfil_url) {
            setInstructorPhotoUrl(directProfile.foto_perfil_url);
            return;
          }

          // 3. Fallback check on 'usuarios' table for foto_perfil_url
          const { data: usuarioRow } = await supabase
            .from("usuarios")
            .select("foto_perfil_url")
            .or(`nome.ilike.%${instructorName}%,email.ilike.%${instructorName}%`)
            .limit(1)
            .maybeSingle();

          if (usuarioRow?.foto_perfil_url) {
            setInstructorPhotoUrl(usuarioRow.foto_perfil_url);
            return;
          }
        } catch (err) {
          console.error("Erro ao buscar foto_perfil_url do perfis:", err);
        }
      }
      setInstructorPhotoUrl(null);
    }

    fetchInstructorPhoto();
  }, [selectedCourse?.instructor]);

  // Student Statistics / Progress state
  const [stats, setStats] = useState<StudentStats>(() => {
    try {
      const saved = localStorage.getItem("aluradev_student_stats");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      completedLessons: [],
      completedCourses: [],
      streak: 0,
      lastStudyDate: null,
      name: ""
    };
  });



  // Current Quiz status
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [projectIdInput, setProjectIdInput] = useState<string>("");
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<boolean | null>(null); // true = correct, false = wrong

  // Track project progress for the selected course
  const [currentProjectProgress, setCurrentProjectProgress] = useState<{
    id_do_projeto?: number;
    status?: string;
    id_epc?: string;
  } | null>(null);

  // Fetch project progress whenever selectedCourse or user changes
  useEffect(() => {
    async function loadCourseProjectProgress() {
      if (!isSupabaseConfigured || !supabase || !selectedCourse) {
        setCurrentProjectProgress(null);
        return;
      }
      try {
        const courseId = parseInt(String(selectedCourse.id).replace("curso-db-", ""), 10) || 1;
        
        // Find project in 'projetos_cursos'
        const { data: projData } = await supabase
          .from("projetos_cursos")
          .select("id")
          .eq("id_do_curso", courseId)
          .limit(1)
          .maybeSingle();

        if (!projData) {
          setCurrentProjectProgress(null);
          return;
        }

        const projId = projData?.id;
        const userMat = (user as any)?.matricula || (user?.id ? extractMatricula(user.id, allUsers) : "");
        let query = supabase.from("projeto_progresso").select("id, id_do_projeto, status, id_epc").eq("id_do_projeto", projId);
        if (userMat) {
          query = query.eq("matricula_usuario", userMat);
        }
        let { data: progData, error: pErr } = await query.limit(1).maybeSingle();
        if (pErr || !progData) {
          let fbQuery = supabase.from("projeto_progresso").select("id, id_do_projeto, status, id_epc").eq("id_do_projeto", projId);
          if (user?.id) fbQuery = fbQuery.eq("id_do_usuario", user.id);
          const fb = await fbQuery.limit(1).maybeSingle();
          progData = fb.data;
        }

        if (progData) {
          setCurrentProjectProgress({
            id_do_projeto: progData.id_do_projeto,
            status: progData.status || "Não iniciado",
            id_epc: progData.id_epc || ""
          });
          if (progData.id_epc) {
            setProjectIdInput(progData.id_epc);
          }
        } else {
          setCurrentProjectProgress(null);
        }
      } catch (err) {
        console.error("Error loading course project progress:", err);
      }
    }

    loadCourseProjectProgress();
  }, [selectedCourse, user?.id]);

  // Role Guard: Redirect non-admin users away from administrative tabs
  useEffect(() => {
    if (accountType === "estudante" && ["usuarios", "cursos_gestao", "turmas"].includes(activeTab)) {
      setActiveTab("dashboard");
    }
  }, [accountType, activeTab]);

  // Scroll to top whenever tab or course view mode changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeTab, isViewingCourseInfo, selectedCourse?.id, selectedLessonIndex]);

  // Global click handler for Executar Código buttons in markdown contents
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const btn = target.closest(".btn-run-code") as HTMLButtonElement | null;
      if (btn) {
        e.preventDefault();
        const blockId = btn.dataset.executeId;
        const rawCode = decodeURIComponent(btn.dataset.rawCode || "");
        const lang = (btn.dataset.lang || "").toLowerCase();

        const outputDiv = document.getElementById(`${blockId}-output`);
        const resultDiv = document.getElementById(`${blockId}-result`);

        if (outputDiv && resultDiv) {
          outputDiv.classList.remove("hidden");
          resultDiv.innerHTML = "";

          const isHtml = lang === "html" || lang === "xml" || /<[a-z][\s\S]*>/i.test(rawCode);

          if (isHtml) {
            const iframe = document.createElement("iframe");
            iframe.className = "w-full border-0 bg-white rounded-lg shadow-sm min-h-[180px]";
            iframe.sandbox.add("allow-scripts", "allow-same-origin");
            resultDiv.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (doc) {
              doc.open();
              doc.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body { font-family: system-ui, -apple-system, sans-serif; padding: 12px; margin: 0; color: #18181b; }
                    </style>
                  </head>
                  <body>
                    ${rawCode}
                  </body>
                </html>
              `);
              doc.close();
            }
          } else {
            const logs: string[] = [];
            const mockConsole = {
              log: (...args: any[]) => {
                logs.push(args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" "));
              },
              error: (...args: any[]) => {
                logs.push("🔴 " + args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" "));
              },
              warn: (...args: any[]) => {
                logs.push("⚠️ " + args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" "));
              }
            };

            try {
              const runFn = new Function("console", rawCode);
              const returnedVal = runFn(mockConsole);

              if (returnedVal !== undefined) {
                logs.push(`➜ Retorno: ${typeof returnedVal === "object" ? JSON.stringify(returnedVal, null, 2) : String(returnedVal)}`);
              }

              if (logs.length === 0) {
                logs.push("✓ Código executado com sucesso (sem saídas no console).");
              }

              resultDiv.innerHTML = `<pre class="text-xs text-emerald-400 font-mono whitespace-pre-wrap">${logs.map(l => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")).join("\n")}</pre>`;
            } catch (err: any) {
              resultDiv.innerHTML = `<pre class="text-xs text-red-400 font-mono font-bold whitespace-pre-wrap">Erro de Execução: ${String(err?.message || err)}</pre>`;
            }
          }
        }
      }

      const closeBtn = target.closest("[data-close-output]") as HTMLElement | null;
      if (closeBtn) {
        e.preventDefault();
        const blockId = closeBtn.dataset.closeOutput;
        const outputDiv = document.getElementById(`${blockId}-output`);
        if (outputDiv) {
          outputDiv.classList.add("hidden");
        }
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  // Active URL/Breadcrumb Path computation
  const getCurrentPath = (): string => {
    if (!user && !isGuest) {
      return "/entrar";
    }
    if (activeTab === "perfil") return "/perfil";
    if (activeTab === "termos") return "/termos-de-uso";
    if (activeTab === "atendimento") {
      if (viewingTicketPdfProtocol) {
        const cleanProto = viewingTicketPdfProtocol.replace(/^#/, "");
        return `/atendimento-${cleanProto}/pdf`;
      }
      if (selectedTicketForDetail || viewingTicketDetailProtocol) {
        const cleanProto = (selectedTicketForDetail?.id || viewingTicketDetailProtocol || "").replace(/^#/, "");
        return `/atendimento-${cleanProto}`;
      }
      return "/atendimento";
    }
    if (activeTab === "documentos") return "/documentos";
    if (activeTab === "ocorrencias") return "/ocorrencias";
    if (activeTab === "usuarios") return "/usuarios";
    return "/dashboard";
  };

  const currentRoutePath = getCurrentPath();

  // Helper to extract clean route regardless of base domain, subdirectories, or hash routing
  const extractPathFromLocation = (): string => {
    if (typeof window === "undefined") return "";
    
    // Check hash-based routing first if present (e.g. #/curso/nome-do-curso or #curso/nome-do-curso)
    if (window.location.hash) {
      const hashPart = window.location.hash.replace(/^#\/?/, "").split("?")[0].trim();
      if (hashPart) return hashPart;
    }

    // Otherwise check pathname
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, "").trim();
    if (pathname && pathname !== "index.html") {
      return pathname;
    }
    return "";
  };

  // Sync browser URL bar and page title with current route path across all environments/domains
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const hasPendingCourse = Boolean(targetRouteRef.current?.courseSlug || (typeof window !== "undefined" && sessionStorage.getItem("aluradev_target_course")));
        
        // Avoid overwriting address bar with /dashboard or /entrar while course/lesson is resolving
        if (activeTab === "lesson-view" && !selectedCourse && hasPendingCourse) {
          return;
        }
        if (!user && !isGuest && hasPendingCourse) {
          return;
        }

        const targetPath = currentRoutePath;
        const currentPathname = window.location.pathname;

        // Update document title dynamically
        if ((targetPath.startsWith("/atendimento-") || targetPath.startsWith("/atendimento/")) && targetPath.endsWith("/pdf")) document.title = `Comprovante de Atendimento | Programa Certo`;
        else if (targetPath.startsWith("/atendimento-") || (targetPath.startsWith("/atendimento/") && targetPath !== "/atendimento")) document.title = `Atendimento | Programa Certo`;
        else if (targetPath === "/entrar") document.title = "Entrar | Programa Certo";
        else if (targetPath === "/cadastrar") document.title = "Cadastrar | Programa Certo";
        else if (targetPath === "/perfil") document.title = "Meu Perfil | Programa Certo";
        else if (targetPath === "/termos-de-uso") document.title = "Termo de Uso e Privacidade | Programa Certo";
        else if (targetPath === "/atendimento") document.title = "Central de Atendimento | Programa Certo";
        else if (targetPath === "/documentos") document.title = "Documentos | Programa Certo";
        else if (targetPath === "/trilhas" || targetPath === "/meus-estudos") document.title = "Meus Estudos | Programa Certo";
        else if (targetPath === "/cursos") document.title = "Trilha de Estudo | Programa Certo";
        else if (targetPath === "/meus-projetos") document.title = "Meus Projetos | Programa Certo";
        else if (targetPath === "/usuarios") document.title = "Usuários | Programa Certo";
        else if (targetPath === "/gestao-cursos") document.title = "Gestão de Cursos | Programa Certo";
        else if (selectedCourse && activeTab === "lesson-view") {
          const currentLesson = selectedCourse.modules?.[selectedModuleIndex]?.lessons?.[selectedLessonIndex];
          if (!isViewingCourseInfo && currentLesson?.title) {
            document.title = `${currentLesson.title} - ${selectedCourse.title} | Programa Certo`;
          } else {
            document.title = `${selectedCourse.title} | Programa Certo`;
          }
        } else {
          document.title = "Programa Certo";
        }

        // Try pushState / replaceState for standard path
        if (currentPathname !== targetPath) {
          window.history.pushState({ path: targetPath }, "", targetPath);
        }
      } catch {
        // Fallback for static servers or environments where pushState is restricted: use hash
        try {
          if (window.location.hash !== `#${currentRoutePath}`) {
            window.location.hash = currentRoutePath;
          }
        } catch {
          // ignore
        }
      }
    }
  }, [currentRoutePath, selectedCourse, activeTab, isViewingCourseInfo, selectedModuleIndex, selectedLessonIndex, user, isGuest]);

  // Handle URL navigation / popstate (browser back/forward buttons & URL changes)
  const applyRouteFromPath = (rawPath: string) => {
    const clean = (rawPath || "").toLowerCase().replace(/^\/+|\/+$/g, "").trim();
    if (!clean || clean === "dashboard" || clean === "index.html") {
      if (user || isGuest) {
        setActiveTab("dashboard");
      }
      return;
    }
    if (clean === "entrar" || clean === "login") {
      setAuthMode("login");
      return;
    }
    if (clean === "cadastrar" || clean === "cadastro" || clean === "signup") {
      setAuthMode("login");
      return;
    }
    if (clean === "perfil" || clean === "profile" || clean === "meu-perfil") {
      setActiveTab("perfil");
      return;
    }
    if (clean === "termos" || clean === "termo" || clean === "termos-de-uso" || clean === "termo-de-uso" || clean === "terms") {
      setActiveTab("termos");
      return;
    }
    if (clean === "usuarios" || clean === "users" || clean === "controle-usuarios") {
      setActiveTab("usuarios");
      return;
    }
    if (clean === "documentos" || clean === "documento" || clean === "docs") {
      setActiveTab("documentos");
      return;
    }
    if (clean === "ocorrencias" || clean === "ocorrencia" || clean === "seguranca") {
      setActiveTab("ocorrencias");
      return;
    }

    if (clean === "atendimento" || clean === "central-de-atendimento" || clean === "suporte" || clean === "ouvidoria" || clean === "ajuda") {
      setActiveTab("atendimento");
      setViewingTicketPdfProtocol(null);
      setViewingTicketDetailProtocol(null);
      setSelectedTicketForDetail(null);
      return;
    }

    if (clean.startsWith("atendimento-") || clean.startsWith("central-de-atendimento-")) {
      setActiveTab("atendimento");
      const protoPart = clean.replace(/^(central-de-)?atendimento-/, "");
      if (protoPart.endsWith("/pdf") || protoPart.endsWith("-pdf")) {
        const cleanProto = protoPart.replace(/(\/pdf|-pdf)$/, "");
        setViewingTicketPdfProtocol(cleanProto);
        setViewingTicketDetailProtocol(cleanProto);
      } else {
        setViewingTicketPdfProtocol(null);
        setViewingTicketDetailProtocol(protoPart);
      }
      return;
    }

    const segments = clean.split("/").filter(Boolean);

    // Atendimento com parâmetros /atendimento/[protocolo]
    if (segments[0] === "atendimento" || segments[0] === "central-de-atendimento") {
      setActiveTab("atendimento");
      if (segments.length >= 3 && (segments[2] === "pdf" || segments[2] === "comprovante")) {
        setViewingTicketPdfProtocol(segments[1]);
        setViewingTicketDetailProtocol(segments[1]);
      } else if (segments.length >= 2 && segments[1].endsWith("-pdf")) {
        const cleanProto = segments[1].replace(/-pdf$/, "");
        setViewingTicketPdfProtocol(cleanProto);
        setViewingTicketDetailProtocol(cleanProto);
      } else if (segments.length >= 2) {
        setViewingTicketPdfProtocol(null);
        setViewingTicketDetailProtocol(segments[1]);
      } else {
        setViewingTicketPdfProtocol(null);
        setViewingTicketDetailProtocol(null);
        setSelectedTicketForDetail(null);
      }
      return;
    }

    // Qualquer outro link ou rota legada (como /cursos, /trilhas, etc.) direciona com segurança para o dashboard
    setActiveTab("dashboard");
  };

  // Trilha enrollment actions ("Meus Estudos")
  const handleEnrollTrilha = (trilhaId: string | number, trilhaName?: string) => {
    const idStr = String(trilhaId);
    setEnrolledTrilhaIds(prev => {
      if (prev.includes(idStr)) return prev;
      const next = [...prev, idStr];
      try {
        localStorage.setItem("aluradev_enrolled_trilhas", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    setEnrollSuccessMessage(`Matrícula realizada com sucesso! A trilha "${trilhaName || 'selecionada'}" foi adicionada aos Meus Estudos.`);
    setTimeout(() => {
      setEnrollSuccessMessage(null);
    }, 4500);
  };

  const handleConfirmEnrollTrilha = (trilhaId: string | number, trilhaName?: string) => {
    handleEnrollTrilha(trilhaId, trilhaName);
    setEnrollModalTrilha(null);
    setIsAddTrilhaModalOpen(false);
    setSelectedTrilhaId(String(trilhaId));
    setActiveTab("courses");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUnenrollTrilha = (trilhaId: string | number, _trilhaName?: string) => {
    const idStr = String(trilhaId);
    setEnrolledTrilhaIds(prev => {
      const next = prev.filter(id => id !== idStr);
      try {
        localStorage.setItem("aluradev_enrolled_trilhas", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleConfirmUnenrollTrilha = (trilhaId: string | number, trilhaName?: string) => {
    handleUnenrollTrilha(trilhaId, trilhaName);
    setUnenrollModalTrilha(null);
    setSelectedTrilhaId("");
    setActiveTab("trilhas");
    setEnrollSuccessMessage(`Matrícula cancelada com sucesso. A trilha "${trilhaName || 'selecionada'}" foi removida de Meus Estudos.`);
    setTimeout(() => {
      setEnrollSuccessMessage(null);
    }, 4500);
  };

  // Auto-enroll in trilhas that already have user progress
  useEffect(() => {
    if (trilhas.length > 0 && enrolledTrilhaIds.length === 0) {
      const activeIds: string[] = [];
      trilhas.forEach(t => {
        const stats = getTrilhaProgressStats(t.id);
        if (stats.completedInTrilha > 0 || stats.status === "em_andamento" || stats.status === "finalizado") {
          activeIds.push(String(t.id));
        }
      });
      if (activeIds.length > 0) {
        setEnrolledTrilhaIds(activeIds);
        try {
          localStorage.setItem("aluradev_enrolled_trilhas", JSON.stringify(activeIds));
        } catch (e) {}
      }
    }
  }, [trilhas]);

  const catalogCategories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach(c => {
      if (c.category && c.category.trim()) {
        set.add(c.category.trim());
      }
    });
    return ["Todas as Categorias", ...Array.from(set).sort()];
  }, [courses]);

  // Deep linking resolution once courses state is populated
  useEffect(() => {
    if (!courses || courses.length === 0) return;

    let targetCourseSlug = targetRouteRef.current?.courseSlug;
    let targetLessonSlug = targetRouteRef.current?.lessonSlug;
    let targetIsInfo = targetRouteRef.current?.isViewingCourseInfo ?? false;

    if (!targetCourseSlug && typeof window !== "undefined") {
      try {
        targetCourseSlug = sessionStorage.getItem("aluradev_target_course") || "";
        targetLessonSlug = sessionStorage.getItem("aluradev_target_lesson") || "";
        targetIsInfo = sessionStorage.getItem("aluradev_target_info") === "true";
      } catch (e) {}
    }

    if (!targetCourseSlug) return;

    const matchedCourse = courses.find((c) => {
      const cSlug = slugifyCourse(c.title);
      const cIdStr = String(c.id).toLowerCase();
      const targetLower = targetCourseSlug.toLowerCase();
      return (
        cSlug === targetLower ||
        cIdStr === targetLower ||
        cIdStr.replace("curso-db-", "") === targetLower.replace("curso-db-", "") ||
        slugify(c.title) === slugify(targetCourseSlug)
      );
    });

    if (matchedCourse) {
      let foundMod = 0;
      let foundLes = 0;
      let found = false;

      if (targetLessonSlug && matchedCourse.modules) {
        const tLesLower = targetLessonSlug.toLowerCase();
        for (let m = 0; m < matchedCourse.modules.length; m++) {
          const mod = matchedCourse.modules[m];
          if (mod.lessons) {
            for (let l = 0; l < mod.lessons.length; l++) {
              const les = mod.lessons[l];
              const lesSlug = slugifyLesson(les.title);
              if (
                lesSlug === tLesLower ||
                String(les.id) === targetLessonSlug ||
                slugify(les.title) === slugify(targetLessonSlug)
              ) {
                foundMod = m;
                foundLes = l;
                found = true;
                break;
              }
            }
          }
          if (found) break;
        }
      }

      setSelectedCourse(matchedCourse);
      setSelectedModuleIndex(foundMod);
      setSelectedLessonIndex(foundLes);
      setIsViewingCourseInfo(targetIsInfo && !found);
      setActiveTab("lesson-view");

      targetRouteRef.current = null;
      try {
        sessionStorage.removeItem("aluradev_target_course");
        sessionStorage.removeItem("aluradev_target_lesson");
        sessionStorage.removeItem("aluradev_target_info");
      } catch (e) {}
    }
  }, [courses]);

  // Listen to browser navigation (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const path = extractPathFromLocation();
      applyRouteFromPath(path);
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, [courses]);

  // Initial URL parsing on app mount & when courses load
  useEffect(() => {
    const initialPath = extractPathFromLocation();
    if (initialPath) {
      applyRouteFromPath(initialPath);
    }
  }, [courses]);

  // Auto open course/lesson view if opened via URL parameter (?view=lesson&courseId=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const courseId = params.get("courseId");
    const modParam = params.get("mod");
    const lesParam = params.get("les");

    if (view === "lesson" && courseId && courses.length > 0) {
      const foundCourse = courses.find(c => c.id === courseId);
      if (foundCourse) {
        setSelectedCourse(foundCourse);
        setSelectedModuleIndex(Number(modParam) || 0);
        setSelectedLessonIndex(Number(lesParam) || 0);
        setActiveTab("lesson-view");
        setIsViewingCourseInfo(false);
      }
    }
  }, [courses]);

  // Open Studio project and record progress in 'projetos_progresso'
  const handleOpenStudioProject = async () => {
    window.open("https://estudio-programacerto.netlify.app/", "_blank");

    if (isSupabaseConfigured && supabase && selectedCourse) {
      try {
        const courseId = parseInt(String(selectedCourse.id).replace("curso-db-", ""), 10) || 1;
        const { data: authUser } = await supabase.auth.getUser();
        const userId = authUser?.user?.id || user?.id || "guest";
        
        // 1. Get or create project in 'projetos_cursos'
        let { data: projData } = await supabase
          .from("projetos_cursos")
          .select("id")
          .eq("id_do_curso", courseId)
          .limit(1)
          .maybeSingle();

        if (!projData) {
          const { data: newProj } = await supabase
            .from("projetos_cursos")
            .insert({
              id_do_curso: courseId,
              nome_do_projeto: selectedCourse.title ? `Projeto: ${selectedCourse.title}` : "Projeto Prático"
            })
            .select("id")
            .single();
          projData = newProj;
        }

        const projId = projData?.id || courseId;
        const userMat = (user as any)?.matricula || (userId && userId !== "guest" ? extractMatricula(userId, allUsers) : "guest");

        // 2. Check if row exists in 'projeto_progresso'
        let query = supabase.from("projeto_progresso").select("id, status, id_epc").eq("id_do_projeto", projId);
        if (userMat && userMat !== "guest") {
          query = query.eq("matricula_usuario", userMat);
        }
        let { data: existingProg, error: pErr } = await query.limit(1).maybeSingle();
        if (pErr || !existingProg) {
          let fbQuery = supabase.from("projeto_progresso").select("id, status, id_epc").eq("id_do_projeto", projId);
          if (userId && userId !== "guest") fbQuery = fbQuery.eq("id_do_usuario", userId);
          const fb = await fbQuery.limit(1).maybeSingle();
          existingProg = fb.data;
        }

        if (existingProg) {
          const newStatus = existingProg.status === "Finalizado" ? "Finalizado" : "Em andamento";
          const { error: uErr } = await supabase
            .from("projeto_progresso")
            .update({
              status: newStatus,
              matricula_usuario: userMat
            })
            .eq("id", existingProg.id);

          if (uErr) {
            await supabase
              .from("projeto_progresso")
              .update({
                status: newStatus,
                id_do_usuario: userId
              })
              .eq("id", existingProg.id);
          }

          setCurrentProjectProgress({
            id_do_projeto: projId,
            status: newStatus,
            id_epc: existingProg.id_epc || ""
          });
        } else {
          const { error: iErr } = await supabase
            .from("projeto_progresso")
            .insert({
              id_do_projeto: projId,
              matricula_usuario: userMat,
              status: "Em andamento"
            });

          if (iErr) {
            await supabase
              .from("projeto_progresso")
              .insert({
                id_do_projeto: projId,
                id_do_usuario: userId,
                status: "Em andamento"
              });
          }

          setCurrentProjectProgress({
            id_do_projeto: projId,
            status: "Em andamento",
            id_epc: ""
          });
        }

        // Mark the current "Abrir meu projeto" lesson complete
        if (selectedCourse) {
          await markLessonComplete(selectedCourse.id, selectedModuleIndex, selectedLessonIndex);
        }
      } catch (err) {
        console.error("Error updating project progress:", err);
      }
    } else {
      if (selectedCourse) {
        markLessonComplete(selectedCourse.id, selectedModuleIndex, selectedLessonIndex);
      }
    }
  };

  // Submit project ID and update 'projetos_progresso'
  const handleSendProjectId = async () => {
    if (!projectIdInput.trim()) {
      alert("Por favor, digite o ID do seu projeto antes de enviar.");
      return;
    }

    if (isSupabaseConfigured && supabase && selectedCourse) {
      try {
        const courseId = parseInt(String(selectedCourse.id).replace("curso-db-", ""), 10) || 1;

        // 1. Get or create project in 'projetos_cursos'
        let { data: projData } = await supabase
          .from("projetos_cursos")
          .select("id")
          .eq("id_do_curso", courseId)
          .limit(1)
          .maybeSingle();

        if (!projData) {
          const { data: newProj } = await supabase
            .from("projetos_cursos")
            .insert({
              id_do_curso: courseId,
              nome_do_projeto: selectedCourse.title ? `Projeto: ${selectedCourse.title}` : "Projeto Prático"
            })
            .select("id")
            .single();
          projData = newProj;
        }

        const projId = projData?.id || courseId;
        const userId = user?.id || "guest";
        const userMat = (user as any)?.matricula || (user?.id ? extractMatricula(user.id, allUsers) : "guest");
        const epcVal = projectIdInput.trim();

        // 2. Check if row exists in 'projeto_progresso'
        let query = supabase.from("projeto_progresso").select("id").eq("id_do_projeto", projId);
        if (userMat && userMat !== "guest") {
          query = query.eq("matricula_usuario", userMat);
        }
        let { data: existingProg, error: pErr } = await query.limit(1).maybeSingle();
        if (pErr || !existingProg) {
          let fbQuery = supabase.from("projeto_progresso").select("id").eq("id_do_projeto", projId);
          if (user?.id) fbQuery = fbQuery.eq("id_do_usuario", user.id);
          const fb = await fbQuery.limit(1).maybeSingle();
          existingProg = fb.data;
        }

        if (existingProg) {
          const { error: uErr } = await supabase
            .from("projeto_progresso")
            .update({
              id_epc: epcVal,
              status: "Finalizado",
              matricula_usuario: userMat
            })
            .eq("id", existingProg.id);

          if (uErr) {
            await supabase
              .from("projeto_progresso")
              .update({
                id_epc: epcVal,
                status: "Finalizado",
                id_do_usuario: userId
              })
              .eq("id", existingProg.id);
          }
        } else {
          const { error: iErr } = await supabase
            .from("projeto_progresso")
            .insert({
              id_do_projeto: projId,
              matricula_usuario: userMat,
              id_epc: epcVal,
              status: "Finalizado"
            });

          if (iErr) {
            await supabase
              .from("projeto_progresso")
              .insert({
                id_do_projeto: projId,
                id_do_usuario: userId,
                id_epc: epcVal,
                status: "Finalizado"
              });
          }
        }

        setCurrentProjectProgress({
          id_do_projeto: projId,
          status: "Finalizado",
          id_epc: epcVal
        });

        // Mark the current lesson complete as the ID has been submitted
        if (selectedCourse) {
          await markLessonComplete(selectedCourse.id, selectedModuleIndex, selectedLessonIndex);
        }

        alert("ID do projeto enviado com sucesso!");
      } catch (err) {
        console.error("Error sending project ID:", err);
        alert("Erro ao enviar ID do projeto. Tente novamente.");
      }
    } else {
      if (selectedCourse) {
        markLessonComplete(selectedCourse.id, selectedModuleIndex, selectedLessonIndex);
      }
      alert("ID do projeto enviado!");
    }
  };

  // Course list modal states
  const [showAllCoursesModal, setShowAllCoursesModal] = useState<boolean>(false);
  const [courseModalFilter, setCourseModalFilter] = useState<"todos" | "em_andamento" | "concluidos">("todos");

  // Trava de scroll e prioridade absoluta da camada (modal ou drawer ativo)
  const isAnyModalOpen = Boolean(
    isMobileMenuOpen ||
    showAllCoursesModal ||
    isAuthModalOpen ||
    courseToDelete ||
    editingCourse ||
    editingLesson ||
    userToDelete ||
    isCreateUserModalOpen ||
    isCreateCourseModalOpen ||
    moduleLessonCourse ||
    isNewTicketModalOpen ||
    ticketToRespond ||
    isAddTrilhaModalOpen ||
    enrollModalTrilha ||
    unenrollModalTrilha ||
    isTermsModalOpen ||
    isDeleteAccountModalOpen ||
    isProfileSecurityModalOpen ||
    isAppealModalOpen
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isAnyModalOpen]);

  // Load data from Supabase if authenticated
  const loadDataFromSupabase = async (currentUser?: any) => {
    const targetUser = currentUser || user;
    if (!isSupabaseConfigured || !supabase) return;
    try {
      // 1. Get user profile from 'usuarios' table
      let userRow: any = null;
      if (targetUser) {
        const targetKey = targetUser.matricula || targetUser.id || "";
        if (targetKey) {
          const { data: usuarioByMat } = await supabase
            .from("usuarios")
            .select("*")
            .eq("matricula", targetKey)
            .maybeSingle();

          if (usuarioByMat) {
            userRow = usuarioByMat;
          } else {
            const { data: usuarioById } = await supabase
              .from("usuarios")
              .select("*")
              .eq("id", targetKey)
              .maybeSingle();
            if (usuarioById) {
              userRow = usuarioById;
            }
          }
        }

        if (!userRow && targetUser.email) {
          const { data: usuarioByEmail } = await supabase
            .from("usuarios")
            .select("*")
            .eq("email", targetUser.email.trim().toLowerCase())
            .maybeSingle();

          if (usuarioByEmail) {
            userRow = usuarioByEmail;
          }
        }
      }

      // Fallback check on 'perfis'
      let legacyProfile: any = null;
      if (!userRow && targetUser) {
        const targetKey = targetUser.matricula || targetUser.id || "";
        const { data: pByMat } = await supabase
          .from("perfis")
          .select("*")
          .eq("matricula_usuario", targetKey)
          .maybeSingle();
        if (pByMat) {
          legacyProfile = pByMat;
        } else {
          const { data: pById } = await supabase
            .from("perfis")
            .select("*")
            .eq("id", targetKey)
            .maybeSingle();
          legacyProfile = pById;
        }
      }

      const isAccountBlocked = userRow && (
        userRow.acesso === "Bloqueado" ||
        userRow.status_da_conta === "Bloqueado" ||
        userRow.status === "Bloqueado"
      );

      if (isAccountBlocked) {
        await supabase.auth.signOut().catch(() => {});
        setUser(null);
        localStorage.removeItem("aluradev_saved_user");
        localStorage.removeItem("aluradev_custom_user");
        localStorage.removeItem("aluradev_saved_guest");
        const motivoTexto = userRow.motivo || "Acesso temporariamente bloqueado pela administração.";
        const resolvedMat = extractMatricula(userRow.matricula || userRow.id || targetUser?.id || "");
        setBlockedAccountInfo({
          id: userRow.matricula || userRow.id || targetUser?.id,
          matricula: resolvedMat,
          email: targetUser?.email || userRow.email,
          name: userRow.nome,
          motivo: motivoTexto
        });
        return;
      }

      let studentNameVal = "";
      if (userRow?.nome) {
        studentNameVal = userRow.nome;
      } else if (legacyProfile?.name) {
        studentNameVal = legacyProfile.name;
      } else if (targetUser?.user_metadata?.nome) {
        studentNameVal = targetUser.user_metadata.nome;
      } else if (targetUser?.user_metadata?.name) {
        studentNameVal = targetUser.user_metadata.name;
      } else if (targetUser?.user_metadata?.full_name) {
        studentNameVal = targetUser.user_metadata.full_name;
      } else if (targetUser?.email) {
        const parts = targetUser.email.split("@")[0].split(/[._-]/).filter(Boolean);
        studentNameVal = parts.map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
      }

      if (!studentNameVal) {
        studentNameVal = "Estudante";
      }

      if (targetUser) {
        setStudentName(studentNameVal);
      }

      if (userRow || legacyProfile) {
        const userPapel = String(userRow?.papel || userRow?.tipo_de_conta || legacyProfile?.cargo || legacyProfile?.account_type || "").toLowerCase();
        const isAdminRole = userPapel.includes("admin");

        if (!isAdminRole) {
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          localStorage.removeItem("aluradev_saved_user");
          localStorage.removeItem("aluradev_custom_user");
          localStorage.removeItem("aluradev_saved_guest");
          setAuthError("Acesso restrito: Somente usuários com o papel de Administrador (admin) na tabela de usuários podem entrar neste sistema.");
          return;
        }

        setAccountType("administrador");

        // Fetch completed progress
        if (targetUser) {
          const userMat = extractMatricula(userRow?.matricula || userRow?.id || targetUser.matricula || targetUser.id || "");
          const { data: cProgresso } = await supabase
            .from("progresso")
            .select("*")
            .or(`matricula_usuario.eq.${userMat},id_do_usuario.eq.${targetUser.id}`);

          let cLessons: any[] = [];
          const { data: cAulasByMat } = await supabase
            .from("aulas_concluidas")
            .select("*")
            .eq("matricula_usuario", userMat);

          if (cAulasByMat && cAulasByMat.length > 0) {
            cLessons = cAulasByMat;
          } else {
            const { data: cAulasData } = await supabase
              .from("aulas_concluidas")
              .select("*")
              .eq("id_do_usuario", targetUser.id);

            if (cAulasData && cAulasData.length > 0) {
              cLessons = cAulasData;
            } else {
              const { data: cAtivData } = await supabase
                .from("atividades_concluidas")
                .select("*")
                .eq("id_do_usuario", targetUser.id);
              if (cAtivData && cAtivData.length > 0) {
                cLessons = cAtivData;
              }
            }
          }

          let cCourses: any[] = [];
          const { data: cCoursesByMat } = await supabase
            .from("cursos_concluidos")
            .select("*")
            .eq("matricula_usuario", userMat);
          if (cCoursesByMat && cCoursesByMat.length > 0) {
            cCourses = cCoursesByMat;
          } else {
            const { data: cCoursesById } = await supabase
              .from("cursos_concluidos")
              .select("*")
              .eq("id_do_usuario", targetUser.id);
            if (cCoursesById) cCourses = cCoursesById;
          }

          let completedLessonsKeys: string[] = [];
          if (cLessons && cLessons.length > 0) {
            cLessons.forEach((l: any) => {
              if (l.id_da_aula) {
                const rawVal = String(l.id_da_aula);
                completedLessonsKeys.push(rawVal);
                const numId = parseInt(rawVal, 10);
                if (!isNaN(numId) && numId >= 1000) {
                  const cId = Math.floor(numId / 1000);
                  const rem = numId % 1000;
                  const mIdx = Math.floor(rem / 100);
                  const lIdx = (rem % 100) - 1;
                  completedLessonsKeys.push(`curso-db-${cId}-${mIdx}-${lIdx}`);
                  completedLessonsKeys.push(`${cId}-${mIdx}-${lIdx}`);
                }
              }
              if (l.course_id !== undefined && l.module_index !== undefined && l.lesson_index !== undefined) {
                completedLessonsKeys.push(`${l.course_id}-${l.module_index}-${l.lesson_index}`);
              }
            });
          }

          let completedCoursesIds: string[] = [];
          if (cCourses && cCourses.length > 0) {
            completedCoursesIds = cCourses.map((c: any) => String(c.id_do_curso || c.course_id));
          }
          if (cProgresso && cProgresso.length > 0) {
            cProgresso.forEach((p: any) => {
              if (p.status_do_curso === "Concluído" && !completedCoursesIds.includes(String(p.id_do_curso))) {
                completedCoursesIds.push(String(p.id_do_curso));
              }
            });
          }

          setStats({
            name: studentNameVal,
            streak: legacyProfile?.streak || 3,
            lastStudyDate: legacyProfile?.last_study_date || null,
            completedLessons: completedLessonsKeys,
            completedCourses: completedCoursesIds,
          });
        }
      } else if (targetUser) {
        await supabase.auth.signOut().catch(() => {});
        setUser(null);
        localStorage.removeItem("aluradev_saved_user");
        localStorage.removeItem("aluradev_custom_user");
        localStorage.removeItem("aluradev_saved_guest");
        setAuthError("Acesso restrito: Sua conta não possui permissão de Administrador na tabela de usuários.");
        return;
      }

      // Always ensure targetUser exists in 'usuarios' table preserving senha and acesso
      if (targetUser && studentNameVal) {
        const mappedRole = authRoleSelected === "administrador" ? "Admin" : authRoleSelected === "instrutor" ? "Instrutor" : "Aluno";
        const roleVal = userRow?.papel || legacyProfile?.account_type || legacyProfile?.cargo || mappedRole;
        const userMat = extractMatricula(userRow?.matricula || userRow?.id || targetUser.matricula || targetUser.id || "");

        try {
          if (!userRow) {
            const createPayload: any = {
              matricula: userMat,
              nome: studentNameVal,
              email: targetUser.email?.trim().toLowerCase() || "",
              papel: roleVal,
              acesso: "Liberado",
              motivo: null,
              data_do_cadastro: new Date().toISOString()
            };
            if (authPassword && authPassword.trim()) {
              createPayload.senha = scramblePassword(authPassword.trim());
            }
            const { error: uErr } = await supabase.from("usuarios").upsert(createPayload, { onConflict: "matricula" });
            if (uErr) {
              await supabase.from("usuarios").upsert({ ...createPayload, id: targetUser.id }, { onConflict: "id" });
            }
          } else {
            // Se já existe mas porventura o acesso veio null ou vazio, garante como 'Liberado'
            const updates: any = {};
            if (!userRow.acesso) {
              updates.acesso = "Liberado";
            }
            if (!userRow.senha && authPassword && authPassword.trim()) {
              updates.senha = scramblePassword(authPassword.trim());
            }
            if (Object.keys(updates).length > 0) {
              if (userRow.matricula) {
                await supabase.from("usuarios").update(updates).eq("matricula", userRow.matricula);
              } else {
                await supabase.from("usuarios").update(updates).eq("id", userRow.id);
              }
            }
          }

          if (roleVal.toString().toLowerCase().includes("admin") || roleVal.toString().toLowerCase().includes("instru")) {
            const { error: pErr } = await supabase.from("perfis").upsert({
              matricula_usuario: userMat,
              name: studentNameVal,
              cargo: roleVal,
              account_type: roleVal.toString().toLowerCase().includes("admin") ? "administrador" : "instrutor"
            }, { onConflict: "matricula_usuario" });
            if (pErr) {
              await supabase.from("perfis").upsert({
                id: targetUser.id,
                name: studentNameVal,
                cargo: roleVal,
                account_type: roleVal.toString().toLowerCase().includes("admin") ? "administrador" : "instrutor"
              }, { onConflict: "id" });
            }
          }
        } catch (e) {
          console.error("Erro ao sincronizar usuário na tabela usuarios:", e);
        }
      }

      // Fetch all registered profiles directly from database tables (usuarios / perfis)
      const { data: dbUsuarios } = await supabase.from("usuarios").select("*");
      let fetchedUsers: any[] = [];

      if (dbUsuarios && dbUsuarios.length > 0) {
        fetchedUsers = dbUsuarios.map(u => {
          const rawKey = String(u.matricula || u.id || "");
          const mat = extractMatricula(rawKey);
          return {
            id: rawKey || mat,
            matricula: mat,
            name: u.nome || "Estudante",
            nome: u.nome || "Estudante",
            email: u.email || `${(u.nome || 'estudante').toLowerCase().replace(/\s/g, '')}@gmail.com`,
            senha: u.senha || "",
            password: u.senha || "",
            account_type: (u.papel || u.tipo_de_conta || "").toLowerCase().includes("admin") ? "administrador" : (u.papel || u.tipo_de_conta || "").toLowerCase().includes("instru") ? "instrutor" : "estudante",
            acesso: (u.acesso === "Bloqueado" || u.status_da_conta === "Bloqueado" || u.status === "Bloqueado") ? "Bloqueado" : "Liberado",
            status: (u.acesso === "Bloqueado" || u.status_da_conta === "Bloqueado" || u.status === "Bloqueado") ? "Bloqueado" : "Liberado",
            motivo: u.motivo || "",
            quantidades_bloqueio: u.quantidades_bloqueio !== undefined ? u.quantidades_bloqueio : null,
            created_at: u.data_do_cadastro ? String(u.data_do_cadastro).split("T")[0] : "2026-07-23"
          };
        });
      } else {
        const { data: dbProfiles } = await supabase.from("perfis").select("*");
        if (dbProfiles && dbProfiles.length > 0) {
          fetchedUsers = dbProfiles.map(p => {
            const rawKey = String(p.matricula_usuario || p.id || "");
            const mat = extractMatricula(rawKey);
            return {
              id: rawKey || mat,
              matricula: mat,
              name: p.name || "Estudante",
              nome: p.name || "Estudante",
              email: targetUser && (rawKey === targetUser.id || mat === extractMatricula(targetUser.id || "")) ? targetUser.email : `${(p.name || 'estudante').toLowerCase().replace(/\s/g, '')}@gmail.com`,
              account_type: (p.account_type || p.cargo || "").toLowerCase().includes("admin") ? "administrador" : (p.account_type || p.cargo || "").toLowerCase().includes("instru") ? "instrutor" : "estudante",
              acesso: "Liberado",
              status: "Liberado",
              motivo: "",
              created_at: p.last_study_date || "2026-07-14"
            };
          });
        }
      }

      setAllUsers(fetchedUsers);

      if (targetUser && fetchedUsers.length > 0) {
        const currentInFetched = fetchedUsers.find(
          u => (u.id === targetUser.id || u.matricula === targetUser.id || (targetUser.email && u.email && u.email.toLowerCase() === targetUser.email.toLowerCase()))
        );
        if (currentInFetched && (currentInFetched.acesso === "Bloqueado" || currentInFetched.status === "Bloqueado")) {
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          localStorage.removeItem("aluradev_saved_user");
          localStorage.removeItem("aluradev_custom_user");
          localStorage.removeItem("aluradev_saved_guest");
          setBlockedAccountInfo({
            id: currentInFetched.id || targetUser.id,
            matricula: currentInFetched.matricula || extractMatricula(currentInFetched.id || targetUser.id || ""),
            email: currentInFetched.email,
            name: currentInFetched.name,
            motivo: currentInFetched.motivo || "Acesso temporariamente bloqueado pela administração."
          });
          return;
        }
        if (currentInFetched) {
          const role = (currentInFetched.account_type || "").toLowerCase();
          if (!role.includes("admin")) {
            await supabase.auth.signOut().catch(() => {});
            setUser(null);
            localStorage.removeItem("aluradev_saved_user");
            localStorage.removeItem("aluradev_custom_user");
            localStorage.removeItem("aluradev_saved_guest");
            setAuthError("Acesso restrito: Somente usuários com o papel de Administrador (admin) na tabela de usuários podem entrar neste sistema.");
            return;
          }
          setAccountType("administrador");
        }
      }

      // Fetch turmas
      const { data: dbTurmas } = await supabase.from("turmas").select("*");
      if (dbTurmas && dbTurmas.length > 0) {
        setClasses(dbTurmas.map((t: any) => ({
          id: String(t.id),
          name: t.nome_da_turma || t.name || "Turma",
          course_title: t.nome_do_curso || t.course_title || "Curso",
          student_count: t.quantidade_de_alunos || t.student_count || 0,
          instructor_name: t.nome_do_instrutor || t.instructor_name || "Instrutor"
        })));
      } else {
        setClasses([]);
      }

      // 2. Fetch trilhas from Supabase ('trilha_de_estudo' or fallback 'trilhas')
      try {
        let { data: dbTrilhas, error: trilhasErr } = await supabase
          .from("trilha_de_estudo")
          .select("*")
          .order("id", { ascending: true });

        if (trilhasErr || !dbTrilhas) {
          const fb = await supabase.from("trilhas").select("*").order("id", { ascending: true });
          dbTrilhas = fb.data;
        }

        if (dbTrilhas && dbTrilhas.length > 0) {
          const mappedTrilhas: Trilha[] = dbTrilhas.map((t: any) => ({
            id: t.id,
            nome_da_trilha: t.nome_da_trilha || t.titulo || t.name || `Trilha ${t.id}`,
            descricao: t.descricao || t.description || "",
            gradient_color: t.gradient_color || t.cor_tema || "from-blue-600 to-indigo-600",
            criado_em: t.criado_em || t.created_at || ""
          }));
          setTrilhas(mappedTrilhas);
          try {
            localStorage.setItem("aluradev_trilhas_cache", JSON.stringify(mappedTrilhas));
          } catch (e) {}
        } else {
          setTrilhas([]);
        }
      } catch (errTrilha) {
        console.error("Erro ao carregar trilhas do Supabase:", errTrilha);
      }

      // 3. Fetch registered courses from localStorage and Supabase ('cursos')
      let localCustomCourses: Course[] = [];
      try {
        const storedCustom = localStorage.getItem("aluradev_custom_courses");
        if (storedCustom) localCustomCourses = JSON.parse(storedCustom);
      } catch (err) {
        console.error("Erro ao ler aluradev_custom_courses:", err);
      }

      let dbCustomCourses: Course[] = [];
      const { data: dbCursos, error: dbCursosError } = await supabase.from("cursos").select("*");

      if (!dbCursosError && dbCursos) {
        for (const dbC of dbCursos) {
          const courseIdStr = String(dbC.id).startsWith("curso-db-") ? String(dbC.id) : `curso-db-${dbC.id}`;
          const { data: dbModulos } = await supabase
            .from("modulos")
            .select("*")
            .eq("id_do_curso", dbC.id)
            .order("ordem", { ascending: true });

          const { data: dbAulas } = await supabase
            .from("aulas_dos_cursos")
            .select("*")
            .eq("id_do_curso", dbC.id)
            .order("aula", { ascending: true });

          let parsedModules: { title: string; lessons: Lesson[] }[] = [];

          const mapLesson = (a: any): Lesson => {
            const quizList: QuizQuestion[] = [];
            if (a.nome_do_teste) {
              const opts = [a.alternativa_a, a.alternativa_b, a.alternativa_c, a.alternativa_d].filter(Boolean);
              const correctIdx = a.alternativa_certa === "A" ? 0 : a.alternativa_certa === "B" ? 1 : a.alternativa_certa === "C" ? 2 : 3;
              quizList.push({
                question: a.nome_do_teste,
                options: opts.length > 0 ? opts : ["Opção A", "Opção B", "Opção C", "Opção D"],
                correctAnswer: correctIdx >= 0 ? correctIdx : 0,
                explanation: "Resposta verificada conforme gabarito do curso."
              });
            }
            return {
              id: a.id,
              title: a.nome_da_aula,
              content: a.conteudo || "Conteúdo em breve.",
              duration: "15 min",
              quiz: quizList
            };
          };

          if (dbModulos && dbModulos.length > 0) {
            parsedModules = dbModulos.map((mod: any) => {
              const moduleLessons = (dbAulas || [])
                .filter((a: any) => String(a.id_do_modulo) === String(mod.id) || (!a.id_do_modulo && mod.ordem === 1))
                .map(mapLesson);

              return {
                title: mod.titulo_do_modulo || mod.nome_do_modulo || "Módulo",
                lessons: moduleLessons
              };
            });
          } else if (dbAulas && dbAulas.length > 0) {
            parsedModules = [
              {
                title: "Módulo Principal",
                lessons: dbAulas.map(mapLesson)
              }
            ];
          }

          const cName = dbC.nome_do_curso || dbC.title || "Curso";
          dbCustomCourses.push({
            id: courseIdStr,
            title: cName,
            description: dbC.descricao || dbC.description || "Sem descrição disponível.",
            category: dbC.categoria || dbC.category || "Geral",
            duration: dbC.duration || `${dbC.aulas || (parsedModules[0]?.lessons.length) || 10} Aulas`,
            instructor: dbC.instrutor || dbC.instructor || "Instrutor da Plataforma",
            gradientColor: dbC.gradient_color || dbC.gradientColor || "#ADD8E6, #000084",
            visibility: dbC.visibilidade || dbC.visibility || "Público",
            lessonsCount: dbC.duration || `${(parsedModules[0]?.lessons.length) || 10} Aulas`,
            id_trilha: dbC.id_trilha !== undefined && dbC.id_trilha !== null ? dbC.id_trilha : (dbC.trilha_id || null),
            isCustom: true,
            modules: parsedModules.length > 0 ? parsedModules : [
              {
                title: "Módulo 1: Conteúdo Principal",
                lessons: Array.from({ length: 10 }, (_, i) => ({
                  title: `Aula ${i + 1}: ${cName}`,
                  duration: "15 min",
                  content: `# ${cName} - Aula ${i + 1}\n\nConteúdo completo do curso.`,
                  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                  quiz: []
                }))
              }
            ]
          });
        }
        const coursesMap = new Map<string, Course>();
        for (const c of localCustomCourses) {
          coursesMap.set(c.title.trim().toLowerCase(), c);
        }
        for (const c of dbCustomCourses) {
          coursesMap.set(c.title.trim().toLowerCase(), c);
        }
        const mergedCourses = Array.from(coursesMap.values());
        setCourses(mergedCourses);
        try {
          localStorage.setItem("aluradev_courses_cache", JSON.stringify(mergedCourses));
        } catch (e) {}
      } else if (localCustomCourses.length > 0) {
        setCourses(localCustomCourses);
        try {
          localStorage.setItem("aluradev_courses_cache", JSON.stringify(localCustomCourses));
        } catch (e) {}
      } else {
        setCourses([]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do Supabase:", err);
    }
  };

  // Listen to Auth State and load data
  useEffect(() => {
    let isMounted = true;

    const restoreSavedSession = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            setUser(session.user);
            localStorage.setItem("aluradev_saved_user", JSON.stringify(session.user));
            await loadDataFromSupabase(session.user);
            if (isMounted) setAuthInitializing(false);
            return;
          }
        }

        // Fallback: check saved user or guest in localStorage
        const savedUserStr = localStorage.getItem("aluradev_saved_user") || localStorage.getItem("aluradev_custom_user");
        const savedGuest = localStorage.getItem("aluradev_saved_guest");

        if (savedUserStr && isMounted) {
          try {
            const parsedUser = JSON.parse(savedUserStr);
            setUser(parsedUser);
            await loadDataFromSupabase(parsedUser);
          } catch (e) {
            console.error("Erro ao carregar usuário salvo:", e);
          }
        }
        localStorage.removeItem("aluradev_saved_guest");
      } catch (err) {
        console.error("Erro ao restaurar sessão:", err);
      } finally {
        if (isMounted) setAuthInitializing(false);
      }
    };

    restoreSavedSession();

    if (isSupabaseConfigured && supabase) {
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          localStorage.setItem("aluradev_saved_user", JSON.stringify(session.user));
          loadDataFromSupabase(session.user);
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setIsGuest(false);
          localStorage.removeItem("aluradev_saved_user");
          localStorage.removeItem("aluradev_custom_user");
          localStorage.removeItem("aluradev_saved_guest");

          const storedCustomCourses = localStorage.getItem("aluradev_custom_courses");
          const customParsed = storedCustomCourses ? JSON.parse(storedCustomCourses) : [];
          const savedStats = localStorage.getItem("aluradev_student_stats");

          setCourses(customParsed);
          if (savedStats) setStats(JSON.parse(savedStats));
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } else {
      // Fallback local init if Supabase is not configured
      const storedCustomCourses = localStorage.getItem("aluradev_custom_courses");
      const customParsed = storedCustomCourses ? JSON.parse(storedCustomCourses) : [];
      setCourses(customParsed);

      const savedStats = localStorage.getItem("aluradev_student_stats");
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }
    }
  }, []);

  // Sync state to localStorage & Supabase when updated
  const saveStats = async (newStats: StudentStats) => {
    setStats(newStats);
    if (!isSupabaseConfigured) {
      localStorage.setItem("aluradev_student_stats", JSON.stringify(newStats));
    }

    if (user && supabase) {
      const userMat = extractMatricula((user as any)?.matricula || user.id || "", allUsers);
      try {
        const { error: uErr } = await supabase
          .from("usuarios")
          .update({
            nome: newStats.name
          })
          .eq("matricula", userMat);
        if (uErr) {
          await supabase
            .from("usuarios")
            .update({
              nome: newStats.name
            })
            .eq("id", user.id);
        }
      } catch {}

      try {
        const { error: pErr } = await supabase
          .from("perfis")
          .update({
            name: newStats.name,
            streak: newStats.streak,
            last_study_date: newStats.lastStudyDate,
          })
          .eq("matricula_usuario", userMat);
        if (pErr) {
          await supabase
            .from("perfis")
            .update({
              name: newStats.name,
              streak: newStats.streak,
              last_study_date: newStats.lastStudyDate,
            })
            .eq("id", user.id);
        }
      } catch (err) {
        console.error("Erro ao salvar progresso no Supabase:", err);
      }
    }
  };

  // Auth Submit handler (Login / SignUp)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!isSupabaseConfigured || !supabase) {
      setAuthError(
        "O serviço de autenticação está indisponível no momento. Por favor, utilize o botão 'Entrar em Modo de Demonstração' abaixo para acessar o sistema."
      );
      return;
    }

    setAuthLoading(true);
    try {
      const emailLower = authEmail.trim().toLowerCase();

      if (authMode === "login") {
        // 1. Check in 'usuarios' table for matching user
        const { data: dbUserCheck } = await supabase
          .from("usuarios")
          .select("*")
          .ilike("email", emailLower)
          .maybeSingle();

        // Check local users list as fallback
        const localUserCheck = allUsers.find(
          u => u.email && u.email.toLowerCase() === emailLower
        );

        const userRecord = dbUserCheck || (localUserCheck ? { ...localUserCheck, senha: localUserCheck.senha || (localUserCheck as any).password } : null);

        let loggedUser: any = null;

        // Se o e-mail não estiver cadastrado na tabela de usuários
        if (!userRecord) {
          // Tenta no auth nativo caso exista apenas lá
          const { data: authData } = await supabase.auth.signInWithPassword({
            email: emailLower,
            password: authPassword
          }).catch(() => ({ data: null }));

          if (authData?.user) {
            loggedUser = authData.user;
          } else {
            // E-mail definitivamente não cadastrado
            setLoginEmailNotRegistered(true);
            setAuthError("Esse e-mail ainda não está cadastrado.");
            setAuthLoading(false);
            return;
          }
        }

        // Se o e-mail está cadastrado, confere se o usuário está bloqueado e valida a senha
        if (userRecord && !loggedUser) {
          const isUserBlocked = (userRecord.acesso === "Bloqueado" || userRecord.status === "Bloqueado" || userRecord.status_da_conta === "Bloqueado");

          if (isUserBlocked) {
            await supabase.auth.signOut().catch(() => {});
            setUser(null);
            localStorage.removeItem("aluradev_saved_user");
            localStorage.removeItem("aluradev_custom_user");
            localStorage.removeItem("aluradev_saved_guest");
            const motivo = userRecord.motivo || "Acesso temporariamente bloqueado pela administração.";
            const recId = userRecord.matricula || userRecord.id;
            setBlockedAccountInfo({
              id: recId,
              matricula: extractMatricula(recId || ""),
              email: emailLower,
              name: userRecord.nome || "Usuário",
              motivo
            });
            setAuthLoading(false);
            return;
          }

          const storedPassword = userRecord.senha || userRecord.password;
          const recordKey = userRecord.matricula || userRecord.id;
          if (storedPassword) {
            const isMatch = passwordsMatch(storedPassword, authPassword);
            if (!isMatch) {
              // Testa native auth como fallback caso a senha tenha sido alterada pelo auth nativo
              const { data: nativeAuth } = await supabase.auth.signInWithPassword({
                email: emailLower,
                password: authPassword
              }).catch(() => ({ data: null }));

              if (!nativeAuth?.user) {
                setLoginEmailNotRegistered(false);
                setAuthError("Senha incorreta.");
                setAuthLoading(false);
                return;
              }
              loggedUser = nativeAuth.user;
            } else {
              loggedUser = {
                id: recordKey,
                matricula: extractMatricula(recordKey || ""),
                email: emailLower,
                user_metadata: {
                  nome: userRecord.nome || emailLower.split("@")[0],
                  name: userRecord.nome || emailLower.split("@")[0]
                }
              };

              // Migração silenciosa para formato seguro embaralhado caso ainda estivesse em texto limpo
              if (storedPassword === authPassword) {
                try {
                  if (userRecord.matricula) {
                    await supabase.from("usuarios").update({ senha: scramblePassword(authPassword) }).eq("matricula", userRecord.matricula);
                  } else {
                    await supabase.from("usuarios").update({ senha: scramblePassword(authPassword) }).eq("id", userRecord.id);
                  }
                } catch (e) {}
              }
            }
          } else {
            // Caso a coluna senha ainda não estivesse salva no registro, tenta native auth
            const { data: nativeAuth } = await supabase.auth.signInWithPassword({
              email: emailLower,
              password: authPassword
            }).catch(() => ({ data: null }));

            if (nativeAuth?.user) {
              loggedUser = nativeAuth.user;
              try {
                if (userRecord.matricula) {
                  await supabase.from("usuarios").update({ senha: scramblePassword(authPassword) }).eq("matricula", userRecord.matricula);
                } else {
                  await supabase.from("usuarios").update({ senha: scramblePassword(authPassword) }).eq("id", userRecord.id);
                }
              } catch (e) {}
            } else {
              setLoginEmailNotRegistered(false);
              setAuthError("Senha incorreta.");
              setAuthLoading(false);
              return;
            }
          }
        }

        if (!loggedUser) {
          setLoginEmailNotRegistered(false);
          setAuthError("Senha incorreta.");
          setAuthLoading(false);
          return;
        }

        // Secondary check on loggedUser matricula/id to be 100% sure it is not blocked
        let postAuthCheck: any = null;
        const { data: checkByMat } = await supabase
          .from("usuarios")
          .select("*")
          .eq("matricula", loggedUser.matricula || loggedUser.id)
          .maybeSingle();
        if (checkByMat) {
          postAuthCheck = checkByMat;
        } else {
          const { data: checkById } = await supabase
            .from("usuarios")
            .select("*")
            .eq("id", loggedUser.id)
            .maybeSingle();
          postAuthCheck = checkById;
        }

        if (postAuthCheck && (postAuthCheck.acesso === "Bloqueado" || postAuthCheck.status === "Bloqueado" || postAuthCheck.status_da_conta === "Bloqueado")) {
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          localStorage.removeItem("aluradev_saved_user");
          localStorage.removeItem("aluradev_custom_user");
          localStorage.removeItem("aluradev_saved_guest");
          const motivo = postAuthCheck.motivo || "Acesso temporariamente bloqueado pela administração.";
          const pKey = postAuthCheck.matricula || postAuthCheck.id || loggedUser.id;
          setBlockedAccountInfo({
            id: pKey,
            matricula: extractMatricula(pKey || ""),
            email: emailLower,
            name: postAuthCheck.nome || loggedUser.user_metadata?.nome || "Usuário",
            motivo
          });
          setAuthLoading(false);
          return;
        }

        // Sync user to 'usuarios' table PRESERVING existing role and status from DB
        const nameToUse = dbUserCheck?.nome || authName.trim() || loggedUser.user_metadata?.nome || loggedUser.user_metadata?.name || loggedUser.email?.split("@")[0] || "Estudante";
        const existingRole = dbUserCheck?.papel || postAuthCheck?.papel;
        const mappedRole = existingRole || (authRoleSelected === "administrador" ? "Admin" : authRoleSelected === "instrutor" ? "Instrutor" : "Aluno");
        const existingAcesso = dbUserCheck?.acesso || postAuthCheck?.acesso || "Liberado";
        const existingMotivo = dbUserCheck?.motivo || postAuthCheck?.motivo || null;

        // Role verification: Only administrators (admin) in 'usuarios' table can enter this admin portal
        const userRoleVal = String(dbUserCheck?.papel || dbUserCheck?.tipo_de_conta || postAuthCheck?.papel || postAuthCheck?.tipo_de_conta || (userRecord as any)?.papel || (userRecord as any)?.account_type || (userRecord as any)?.cargo || "").toLowerCase();
        const isAllowedAdmin = userRoleVal.includes("admin");

        if (!isAllowedAdmin) {
          await supabase.auth.signOut().catch(() => {});
          setUser(null);
          localStorage.removeItem("aluradev_saved_user");
          localStorage.removeItem("aluradev_custom_user");
          localStorage.removeItem("aluradev_saved_guest");
          setAuthError("Acesso não autorizado. Somente usuários com o papel de Administrador (admin) na tabela de usuários podem acessar este painel.");
          setAuthLoading(false);
          return;
        }

        setAccountType("administrador");

        try {
          const userMat = extractMatricula(dbUserCheck?.matricula || postAuthCheck?.matricula || loggedUser.matricula || loggedUser.id || "");
          const { error: upErr } = await supabase.from("usuarios").upsert({
            matricula: userMat,
            nome: nameToUse,
            email: emailLower,
            papel: mappedRole,
            senha: scramblePassword(authPassword),
            acesso: existingAcesso,
            motivo: existingMotivo
          }, { onConflict: "matricula" });

          if (upErr) {
            await supabase.from("usuarios").upsert({
              id: loggedUser.id,
              nome: nameToUse,
              email: emailLower,
              papel: mappedRole,
              senha: scramblePassword(authPassword),
              acesso: existingAcesso,
              motivo: existingMotivo
            }, { onConflict: "id" });
          }

          await supabase.from("usuarios").update({
            senha: scramblePassword(authPassword),
            acesso: existingAcesso
          }).eq("email", emailLower);

          const { error: pErr } = await supabase.from("perfis").upsert({
            matricula_usuario: userMat,
            name: nameToUse,
            cargo: mappedRole,
            account_type: "administrador"
          }, { onConflict: "matricula_usuario" });
          if (pErr) {
            await supabase.from("perfis").upsert({
              id: loggedUser.id,
              name: nameToUse,
              cargo: mappedRole,
              account_type: "administrador"
            }, { onConflict: "id" });
          }
        } catch (err) {
          console.error("Erro ao sincronizar usuario na tabela usuarios:", err);
        }

        setUser(loggedUser);
        localStorage.setItem("aluradev_saved_user", JSON.stringify(loggedUser));
        localStorage.setItem("aluradev_custom_user", JSON.stringify(loggedUser));
        localStorage.removeItem("aluradev_saved_guest");
        setIsGuest(false);
        setIsAuthModalOpen(false);
        setAuthPassword("");
        setAuthError(null);
        setLoginEmailNotRegistered(false);
        scrollToTop();
        await loadDataFromSupabase(loggedUser);

      } else {
        // Sign Up Mode
        if (!termsAcceptedForSignup) {
          throw new Error("Você deve concordar com o Termo de Uso e com o Termo de Privacidade para criar sua conta.");
        }
        if (authPassword.length < 6) {
          throw new Error("A senha deve conter no mínimo 6 caracteres.");
        }

        const nameToUse = authName.trim() || "Estudante";
        const mappedRole = authRoleSelected === "administrador" ? "Admin" : authRoleSelected === "instrutor" ? "Instrutor" : "Aluno";
        const scrambledPass = scramblePassword(authPassword);

        // Check if email already exists in 'usuarios' table
        const { data: dbExistingUser } = await supabase
          .from("usuarios")
          .select("*")
          .eq("email", emailLower)
          .maybeSingle();

        if (dbExistingUser) {
          throw new Error("Este e-mail já está cadastrado. Por favor, acesse a opção de login.");
        }

        // Try native auth signup in background, proceed cleanly regardless of rate-limits
        try {
          await supabase.auth.signUp({
            email: emailLower,
            password: authPassword,
            options: {
              data: {
                name: nameToUse,
                nome: nameToUse,
                tipo_de_conta: mappedRole
              }
            }
          });
        } catch (e) {
          console.warn("Notice: native auth sign up note:", e);
        }

        const createdMatricula = generateMatricula(allUsers);

        // Register directly in 'usuarios' table with exact columns: matricula, nome, email, senha, papel, data_do_cadastro, acesso, motivo
        try {
          const userPayload = {
            matricula: createdMatricula,
            nome: nameToUse,
            email: emailLower,
            senha: scrambledPass,
            papel: mappedRole,
            acesso: "Liberado",
            motivo: null,
            data_do_cadastro: new Date().toISOString()
          };

          const { error: upsertErr } = await supabase.from("usuarios").upsert(userPayload, { onConflict: "matricula" });
          if (upsertErr) {
            await supabase.from("usuarios").upsert({ ...userPayload, id: createdMatricula }, { onConflict: "id" });
          }

          // Also guarantee update by email in case a database trigger had created the row without senha and acesso
          await supabase.from("usuarios").update({
            nome: nameToUse,
            senha: scrambledPass,
            papel: mappedRole,
            acesso: "Liberado",
            motivo: null
          }).eq("email", emailLower);

          if (authRoleSelected === "administrador" || authRoleSelected === "instrutor") {
            const { error: pErr } = await supabase.from("perfis").upsert({
              matricula_usuario: createdMatricula,
              name: nameToUse,
              email: emailLower,
              cargo: mappedRole,
              account_type: authRoleSelected
            }, { onConflict: "matricula_usuario" });
            if (pErr) {
              await supabase.from("perfis").upsert({
                id: createdMatricula,
                name: nameToUse,
                email: emailLower,
                cargo: mappedRole,
                account_type: authRoleSelected
              }, { onConflict: "id" });
            }
          }
        } catch (e) {
          console.error("Erro ao sincronizar dados do usuário nas tabelas:", e);
        }

        // Salvar também no cache local de usuários criados
        try {
          const cachedRaw = localStorage.getItem("aluradev_created_users");
          const cachedList = cachedRaw ? JSON.parse(cachedRaw) : [];
          const updatedCreated = [
            {
              id: createdMatricula,
              matricula: createdMatricula,
              nome: nameToUse,
              email: emailLower,
              papel: mappedRole,
              senha: scrambledPass,
              acesso: "Liberado",
              motivo: null,
              data_do_cadastro: new Date().toISOString()
            },
            ...cachedList.filter((u: any) => u.email?.toLowerCase() !== emailLower)
          ];
          localStorage.setItem("aluradev_created_users", JSON.stringify(updatedCreated));
        } catch (e) {}

        // Encaminhar para a tela de login com o e-mail preenchido e senha vazia (NÃO entra automaticamente)
        setAuthMode("login");
        setAuthEmail(emailLower);
        setAuthPassword("");
        setAuthName("");
        setTermsAcceptedForSignup(false);
        setAuthError(null);
        setLoginEmailNotRegistered(false);

        if (typeof window !== "undefined" && window.history && window.location.pathname !== "/") {
          try {
            window.history.replaceState({}, "", "/entrar");
          } catch (e) {}
        }

        scrollToTop();
        alert("Cadastro realizado com sucesso! Faça login com seu e-mail e senha para acessar sua conta.");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const msg = err?.message || "";
      if (
        msg.toLowerCase().includes("invalid login credentials") || 
        msg.toLowerCase().includes("invalid_grant") ||
        msg.toLowerCase().includes("senha incorreta")
      ) {
        setLoginEmailNotRegistered(false);
        setAuthError("Senha incorreta.");
      } else if (msg.toLowerCase().includes("ainda não está cadastrado")) {
        setLoginEmailNotRegistered(true);
        setAuthError("Esse e-mail ainda não está cadastrado.");
      } else {
        setAuthError(err.message || "No momento não foi possível concluir a operação. Por favor, tente novamente em alguns instantes.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Explicit Guest/Demonstration Login Handler
  const handleGuestLogin = () => {
    setAuthLoading(true);
    setAuthError(null);
    setTimeout(() => {
      setAuthLoading(false);
      const savedStats = localStorage.getItem("aluradev_student_stats");
      if (savedStats) {
        try {
          const parsed = JSON.parse(savedStats);
          if (parsed.name) setStudentName(parsed.name);
        } catch (err) {
          console.error(err);
        }
      }
      setAccountType("estudante");
      setIsGuest(true);
      localStorage.setItem("aluradev_saved_guest", "true");
      localStorage.removeItem("aluradev_saved_user");
      localStorage.removeItem("aluradev_custom_user");
      // Clear forms
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
    }, 600);
  };

  // Timer para contagem regressiva de expiração do código de recuperação
  useEffect(() => {
    let interval: any = null;
    if (forgotTimer > 0) {
      interval = setInterval(() => {
        setForgotTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [forgotTimer]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Verifica se o e-mail existe na base de dados (Supabase ou usuários locais)
  const checkEmailRegistered = async (emailToCheck: string): Promise<boolean> => {
    const clean = emailToCheck.trim().toLowerCase();
    
    // 1. Consulta na tabela 'usuarios' do Supabase
    if (supabase) {
      try {
        const { data } = await supabase
          .from("usuarios")
          .select("*")
          .eq("email", clean)
          .maybeSingle();
        if (data && data.email) return true;
      } catch (err) {
        console.warn("Erro ao consultar usuarios no Supabase:", err);
      }
    }

    // 2. Consulta na lista carregada em memória allUsers
    if (allUsers && allUsers.length > 0) {
      const existsLocally = allUsers.some(u => u.email && u.email.toLowerCase() === clean);
      if (existsLocally) return true;
    }

    // 3. Fallback: verificar em cache local
    try {
      const cached = localStorage.getItem("aluradev_all_users");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.some(u => u.email?.toLowerCase() === clean)) {
          return true;
        }
      }
    } catch (e) {}

    return false;
  };

  // Handler: Enviar código de recuperação de senha via e-mail (apenas se e-mail estiver cadastrado)
  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setEmailNotRegistered(false);

    const emailToUse = forgotEmail.trim().toLowerCase();
    if (!emailToUse) {
      setForgotError("Por favor, digite o seu endereço de e-mail.");
      return;
    }

    setForgotLoading(true);
    try {
      // Verifica primeiro se o e-mail é cadastrado
      const isRegistered = await checkEmailRegistered(emailToUse);
      if (!isRegistered) {
        setEmailNotRegistered(true);
        setForgotError("Este e-mail ainda não está cadastrado na plataforma.");
        setForgotLoading(false);
        return;
      }

      // Se cadastrado, dispara o envio do código via e-mail seguro
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível enviar o código. Tente novamente.");
      }

      setForgotStep(2);
      setForgotCode("");
      setForgotTimer(900); // 15 minutos
      setForgotSuccess("Código de segurança enviado com sucesso para o seu e-mail!");
    } catch (err: any) {
      setForgotError(err.message || "Ocorreu um erro ao solicitar a redefinição de senha.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Handler: Validar código de 6 dígitos no backend e avançar para definição de nova senha
  const handleVerifyCode = async (codeToVerify?: string) => {
    const code = (codeToVerify !== undefined ? codeToVerify : forgotCode).trim();
    if (!code || code.length !== 6) {
      setForgotError("Por favor, digite o código completo de 6 dígitos.");
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    try {
      const emailToUse = forgotEmail.trim().toLowerCase();
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          code,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Código de verificação incorreto ou expirado.");
      }

      // Avança para a Etapa 3 (Apenas agora exibe a tela de Nova Senha)
      setForgotStep(3);
      setForgotError(null);
      setForgotSuccess("Código verificado! Agora digite a sua nova senha de acesso.");
    } catch (err: any) {
      setForgotError(err.message || "Erro ao verificar código.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Handler: Gravar a nova senha após validação do código
  const handleCompleteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    const emailToUse = forgotEmail.trim().toLowerCase();
    const codeToUse = forgotCode.trim();

    if (!codeToUse || codeToUse.length !== 6) {
      setForgotError("Código de 6 dígitos ausente ou inválido.");
      setForgotStep(2);
      return;
    }

    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("A confirmação de senha não coincide com a nova senha digitada.");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/complete-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          code: codeToUse,
          newPassword: forgotNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao atualizar senha.");
      }

      // Atualiza senha no Supabase se o banco estiver conectado
      if (supabase) {
        try {
          await supabase
            .from("usuarios")
            .update({ senha: scramblePassword(forgotNewPassword) })
            .eq("email", emailToUse);
        } catch (dbErr) {
          console.error("Erro ao sincronizar senha no Supabase:", dbErr);
        }
      }

      // Atualiza lista local de usuários se carregada
      setAllUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.email?.toLowerCase() === emailToUse
            ? { ...u, senha: forgotNewPassword, password: forgotNewPassword }
            : u
        )
      );

      setForgotSuccess("Senha alterada com sucesso! Redirecionando para o login...");
      
      // Pré-preenche no formulário de login
      setAuthEmail(emailToUse);
      setAuthPassword(forgotNewPassword);

      setTimeout(() => {
        setAuthMode("login");
        setForgotStep(1);
        setForgotCode("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
        setForgotSuccess(null);
        setForgotError(null);
        setEmailNotRegistered(false);
      }, 1800);
    } catch (err: any) {
      setForgotError(err.message || "Erro ao redefinir a senha.");
    } finally {
      setForgotLoading(false);
    }
  };

  // Handlers para o fluxo de Exclusão Definitiva de Conta com Código de Segurança
  const handleRequestDeleteCode = async () => {
    const emailToUse = user?.email?.trim().toLowerCase();
    if (!emailToUse) {
      setDeleteAccountError("Não foi possível identificar o e-mail da sua conta para envio do código.");
      return;
    }

    setDeleteAccountLoading(true);
    setDeleteAccountError(null);
    setDeleteAccountSuccess(null);

    try {
      const res = await fetch("/api/auth/request-delete-account-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível enviar o código para o seu e-mail.");
      }

      setDeleteAccountStep(2);
      setDeleteAccountCode("");
      setDeleteAccountTimer(900); // 15 minutos de validade
      setDeleteAccountSuccess("Código de segurança enviado com sucesso para seu e-mail!");
    } catch (err: any) {
      setDeleteAccountError(err.message || "Erro ao solicitar exclusão da conta.");
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    const emailToUse = user?.email?.trim().toLowerCase();
    const codeToUse = deleteAccountCode.trim();

    if (!emailToUse) {
      setDeleteAccountError("E-mail não identificado.");
      return;
    }

    if (!codeToUse || codeToUse.length !== 6) {
      setDeleteAccountError("Digite o código de 6 dígitos que você recebeu no e-mail.");
      return;
    }

    setDeleteAccountLoading(true);
    setDeleteAccountError(null);

    try {
      // 1. Validação no backend do código de 6 dígitos
      const res = await fetch("/api/auth/confirm-delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToUse, code: codeToUse }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Código de verificação incorreto ou expirado.");
      }

      // 2. Exclusão de TODOS os dados do usuário nas tabelas do Supabase
      if (supabase) {
        try {
          const userMat = extractMatricula((user as any)?.matricula || user?.id || "", allUsers);
          if (userMat) {
            await supabase.from("aulas_concluidas").delete().eq("matricula_usuario", userMat);
            await supabase.from("cursos_concluidos").delete().eq("matricula_usuario", userMat);
            await supabase.from("projeto_progresso").delete().eq("matricula_usuario", userMat);
          }
          if (user?.id) {
            await supabase.from("aulas_concluidas").delete().eq("id_do_usuario", user.id);
            await supabase.from("atividades_concluidas").delete().eq("id_do_usuario", user.id);
            await supabase.from("cursos_concluidos").delete().eq("id_do_usuario", user.id);
          }
          await supabase.from("usuarios").delete().eq("email", emailToUse);
          if (userMat) {
            await supabase.from("usuarios").delete().eq("matricula", userMat);
            await supabase.from("perfis").delete().eq("matricula_usuario", userMat);
          }
          await supabase.auth.signOut().catch(() => {});
        } catch (dbErr) {
          console.warn("Aviso ao limpar dados no Supabase:", dbErr);
        }
      }

      // 3. Remover usuário da lista local em memória
      setAllUsers((prev) => prev.filter((u) => u.email?.toLowerCase() !== emailToUse && u.id !== user?.id));

      // 4. Excluir permanentemente todos os dados armazenados no navegador (localStorage)
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith("aluradev_") ||
            key.includes("lesson") ||
            key.includes("course") ||
            key.includes("stats") ||
            key.includes("progress") ||
            key.includes("student")
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (storageErr) {
        console.warn("Erro ao limpar dados locais:", storageErr);
      }

      // 5. Resetar estados do aplicativo
      setUser(null);
      setIsGuest(false);
      setStats({
        completedLessons: [],
        completedCourses: [],
        streak: 0,
        lastStudyDate: null,
        name: ""
      });
      setStudentName("Estudante");
      setAccountType("estudante");

      // 6. Avançar para a tela de confirmação de exclusão realizada
      setDeleteAccountStep(3);
    } catch (err: any) {
      setDeleteAccountError(err.message || "Erro ao processar a exclusão da conta.");
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const handleLogout = async () => {
    const userEmail = user?.email || authEmail || "";
    localStorage.removeItem("aluradev_custom_user");
    localStorage.removeItem("aluradev_saved_user");
    localStorage.removeItem("aluradev_saved_guest");
    setUser(null);
    setIsGuest(false);
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
    setAccountType("estudante");
    setActiveTab("dashboard");

    // Retornar obrigatoriamente para a tela de login com o e-mail mantido e senha em branco
    setAuthMode("login");
    setAuthEmail(userEmail);
    setAuthPassword("");
    setAuthName("");
    setTermsAcceptedForSignup(false);
    setAuthError(null);
    setLoginEmailNotRegistered(false);

    if (typeof window !== "undefined" && window.history && window.location.pathname !== "/") {
      try {
        window.history.replaceState({}, "", "/entrar");
      } catch (e) {}
    }

    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error("Erro ao deslogar:", err);
      }
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: "estudante" | "instrutor" | "administrador") => {
    setAllUsers(prev => prev.map(u => (u.id === userId || u.matricula === userId) ? { ...u, account_type: newRole } : u));

    if (supabase) {
      const dbRole = newRole === "administrador" ? "Admin" : newRole === "instrutor" ? "Instrutor" : "Aluno";
      try {
        const { error: uErr } = await supabase
          .from("usuarios")
          .update({ papel: dbRole })
          .eq("matricula", userId);
        if (uErr) {
          await supabase.from("usuarios").update({ papel: dbRole }).eq("id", userId);
        }
      } catch (err) {
        console.error("Erro ao atualizar papel do usuário em usuarios:", err);
      }
      try {
        const { error: pErr } = await supabase
          .from("perfis")
          .update({ cargo: dbRole, account_type: newRole })
          .eq("matricula_usuario", userId);
        if (pErr) {
          await supabase.from("perfis").update({ cargo: dbRole, account_type: newRole }).eq("id", userId);
        }
      } catch (err) {
        console.error("Erro ao atualizar papel do usuário em perfis:", err);
      }
    }
  };

  const handleRemoveUser = async (userId: string) => {
    setAllUsers(prev => {
      const updated = prev.filter(u => u.id !== userId && u.matricula !== userId);
      try {
        localStorage.setItem("aluradev_all_users", JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });

    if (supabase) {
      try {
        const { error: uErr } = await supabase.from("usuarios").delete().eq("matricula", userId);
        if (uErr) await supabase.from("usuarios").delete().eq("id", userId);
      } catch (err) {
        console.error("Erro ao remover usuário em usuarios:", err);
      }
      try {
        const { error: pErr } = await supabase.from("perfis").delete().eq("matricula_usuario", userId);
        if (pErr) await supabase.from("perfis").delete().eq("id", userId);
      } catch (err) {
        console.error("Erro ao remover usuário em perfis:", err);
      }
    }
  };

  const handleConfirmDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToDelete) return;

    const inputPass = deleteAdminPassword.trim();
    if (!inputPass) {
      setDeleteErrorMsg("Por favor, digite sua senha de administrador para autorizar.");
      return;
    }

    // Check entered password against logged-in admin user password or authPassword or allUsers state
    const loggedInUserObj = allUsers.find(u => u.id === user?.id || u.email?.toLowerCase() === user?.email?.toLowerCase());
    const knownPass = (user as any)?.password || authPassword || loggedInUserObj?.password;

    if (knownPass && !passwordsMatch(knownPass, inputPass)) {
      setDeleteErrorMsg("Senha incorreta. Por favor, digite a senha atual que você usa para fazer login.");
      return;
    }

    setIsDeletingUser(true);
    const targetId = userToDelete.id;
    const targetMat = userToDelete.matricula || extractMatricula(targetId || "");
    const targetEmail = userToDelete.email?.toLowerCase();
    const targetName = userToDelete.name;

    try {
      // 1. Remove from allUsers state and localStorage
      setAllUsers(prev => {
        const updated = prev.filter(u => u.id !== targetId && u.matricula !== targetMat && u.email?.toLowerCase() !== targetEmail);
        try {
          localStorage.setItem("aluradev_all_users", JSON.stringify(updated));
        } catch (err) {}
        return updated;
      });

      // 2. Supabase cascade deletions for all tables with user references
      if (supabase) {
        try {
          if (targetMat) await supabase.from("usuarios").delete().eq("matricula", targetMat);
          if (targetEmail) await supabase.from("usuarios").delete().eq("email", targetEmail);
          if (targetId) await supabase.from("usuarios").delete().eq("id", targetId);
        } catch (err) {
          console.error("Erro ao remover de usuarios:", err);
        }
        try {
          if (targetMat) await supabase.from("perfis").delete().eq("matricula_usuario", targetMat);
          if (targetId) await supabase.from("perfis").delete().eq("id", targetId);
        } catch (err) {
          console.error("Erro ao remover de perfis:", err);
        }
        try {
          if (targetMat) {
            await supabase.from("aulas_concluidas").delete().eq("matricula_usuario", targetMat);
            await supabase.from("cursos_concluidos").delete().eq("matricula_usuario", targetMat);
            await supabase.from("projeto_progresso").delete().eq("matricula_usuario", targetMat);
          }
        } catch (err) {
          console.error("Erro ao remover progressos por matricula_usuario:", err);
        }
      }

      setUserToDelete(null);
      setDeleteAdminPassword("");
      setDeleteErrorMsg("");
      alert(`A conta do usuário "${targetName}" e todos os seus dados foram excluídos com sucesso!`);
    } catch (err) {
      console.error("Erro ao excluir conta de usuário:", err);
      setDeleteErrorMsg("Ocorreu um erro ao excluir a conta. Tente novamente.");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserErrorMsg(null);
    setCreateUserSuccessMsg(null);

    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setCreateUserErrorMsg("Por favor, preencha o nome, e-mail e a senha do usuário.");
      return;
    }

    const adminPassInput = createUserAdminPassword.trim();
    if (!adminPassInput) {
      setCreateUserErrorMsg("Por favor, digite a sua senha atual de administrador para confirmar a criação do usuário.");
      return;
    }

    setIsCreatingUserSubmitting(true);

    try {
      // Validar a senha do administrador conectado
      const loggedInUserObj = allUsers.find(
        (u) => u.id === user?.id || (user?.email && u.email?.toLowerCase() === user.email.toLowerCase())
      );
      let knownAdminPass =
        loggedInUserObj?.senha ||
        loggedInUserObj?.password ||
        (user as any)?.password ||
        authPassword;

      if (!knownAdminPass && supabase && (user?.id || user?.email)) {
        try {
          const { data: adminRow } = await supabase
            .from("usuarios")
            .select("senha")
            .eq("email", (user?.email || "").toLowerCase())
            .limit(1)
            .maybeSingle();
          if (adminRow?.senha) {
            knownAdminPass = adminRow.senha;
          }
        } catch {}
      }

      if (knownAdminPass && !passwordsMatch(knownAdminPass, adminPassInput)) {
        setCreateUserErrorMsg("Sua senha de administrador está incorreta. Verifique e tente novamente.");
        setIsCreatingUserSubmitting(false);
        return;
      }

      const emailFormatted = newUserEmail.trim().toLowerCase();
      const emailExistsLocal = allUsers.some(
        (u) => u.email && u.email.toLowerCase().trim() === emailFormatted
      );
      if (emailExistsLocal) {
        setCreateUserErrorMsg("Já existe um usuário cadastrado com este endereço de e-mail.");
        setIsCreatingUserSubmitting(false);
        return;
      }

      const newUserMatricula = generateMatricula(allUsers);
      const nowIso = new Date().toISOString();
      const todayDate = nowIso.split("T")[0];
      const scrambledUserPassword = scramblePassword(newUserPassword.trim());
      const dbRole =
        newUserRole === "administrador"
          ? "Admin"
          : newUserRole === "instrutor"
          ? "Instrutor"
          : "Aluno";

      // Gravar diretamente na tabela usuarios do banco de dados usando matricula como chave principal (com acesso sempre Liberado)
      if (supabase) {
        let { error: dbErr } = await supabase.from("usuarios").upsert(
          {
            matricula: newUserMatricula,
            nome: newUserName.trim(),
            email: emailFormatted,
            papel: dbRole,
            senha: scrambledUserPassword,
            acesso: "Liberado",
            motivo: null,
            data_do_cadastro: nowIso
          },
          { onConflict: "matricula" }
        );

        if (dbErr) {
          const fb = await supabase.from("usuarios").upsert(
            {
              id: newUserMatricula,
              nome: newUserName.trim(),
              email: emailFormatted,
              papel: dbRole,
              senha: scrambledUserPassword,
              acesso: "Liberado",
              motivo: null,
              data_do_cadastro: nowIso
            },
            { onConflict: "id" }
          );
          dbErr = fb.error;
        }

        if (dbErr) {
          console.error("Erro ao criar usuário na tabela usuarios:", dbErr);
          setCreateUserErrorMsg(
            dbErr.message || "Não foi possível salvar o usuário no banco de dados."
          );
          setIsCreatingUserSubmitting(false);
          return;
        }

        if (newUserRole === "administrador" || newUserRole === "instrutor") {
          try {
            const { error: pErr } = await supabase.from("perfis").upsert(
              {
                matricula_usuario: newUserMatricula,
                name: newUserName.trim(),
                email: emailFormatted,
                account_type: newUserRole,
                cargo: dbRole
              },
              { onConflict: "matricula_usuario" }
            );
            if (pErr) {
              await supabase.from("perfis").upsert(
                {
                  id: newUserMatricula,
                  name: newUserName.trim(),
                  email: emailFormatted,
                  account_type: newUserRole,
                  cargo: dbRole
                },
                { onConflict: "id" }
              );
            }
          } catch (err) {
            console.error("Erro ao criar perfil em perfis:", err);
          }
        }
      }

      const newUser = {
        id: newUserMatricula,
        matricula: newUserMatricula,
        name: newUserName.trim(),
        nome: newUserName.trim(),
        email: emailFormatted,
        senha: scrambledUserPassword,
        password: newUserPassword.trim(),
        account_type: newUserRole,
        acesso: "Liberado",
        status: "Liberado",
        status_da_conta: "Liberado",
        motivo: "",
        created_at: todayDate
      };

      setAllUsers((prev) => {
        const updated = [newUser, ...prev.filter((u) => u.email?.toLowerCase() !== emailFormatted)];
        try {
          localStorage.setItem("aluradev_all_users", JSON.stringify(updated));
        } catch (err) {}
        return updated;
      });

      try {
        const createdUsers = JSON.parse(localStorage.getItem("aluradev_created_users") || "[]");
        const updatedCreated = [
          newUser,
          ...createdUsers.filter((u: any) => u.email?.toLowerCase() !== emailFormatted)
        ];
        localStorage.setItem("aluradev_created_users", JSON.stringify(updatedCreated));
      } catch (err) {}

      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setShowNewUserPassword(false);
      setCreateUserAdminPassword("");
      setShowCreateUserAdminPassword(false);
      setNewUserRole("estudante");
      setNewUserStatus("Liberado");
      setNewUserMotivo("");
      setIsCreateUserModalOpen(false);
      setCreateUserSuccessMsg(
        `Usuário "${newUser.name}" criado com sucesso e salvo diretamente no banco de dados com acesso Liberado!`
      );
      scrollToTop();
    } catch (err: any) {
      setCreateUserErrorMsg(err?.message || "Erro ao criar usuário. Tente novamente.");
    } finally {
      setIsCreatingUserSubmitting(false);
    }
  };

  const handleOpenEditUser = async (userItem: any, fromAtendimento: boolean = false) => {
    setIsCreatingUserPage(false);
    setEditingUser(userItem);
    setEditingUserFromAtendimento(fromAtendimento);
    setIsEditingUserFields(false);
    setEditUserSuccessMsg(null);
    setEditUserName(userItem.name || userItem.nome || "");
    setEditUserEmail(userItem.email || "");
    setEditUserPassword("");
    setShowEditUserPassword(false);
    setEditUserRole(userItem.account_type || "estudante");
    const isBlocked = userItem.acesso === "Bloqueado" || userItem.status === "Bloqueado" || userItem.status_da_conta === "Bloqueado";
    setEditUserStatus(isBlocked ? "Bloqueado" : "Liberado");
    setEditUserMotivo(userItem.motivo || "");
    scrollToTop();

    const isCurrentLogged = userItem.id === user?.id || (user?.email && userItem.email && userItem.email.toLowerCase() === user.email.toLowerCase());
    const initLessons = isCurrentLogged ? stats.completedLessons.length : 0;
    const initCourses = isCurrentLogged ? stats.completedCourses.length : 0;
    const initTrilhas = isCurrentLogged ? enrolledTrilhaIds.length : 0;

    setEditingUserStats({
      completedLessons: initLessons,
      completedCourses: initCourses,
      completedTrilhas: initTrilhas,
      loading: !!supabase
    });

    if (supabase && (userItem.matricula || userItem.id)) {
      const targetMat = extractMatricula(userItem.matricula || userItem.id, allUsers);
      try {
        let totalLessons = 0;
        const { data: acMatData, count: acMatCount } = await supabase
          .from("aulas_concluidas")
          .select("*", { count: "exact" })
          .eq("matricula_usuario", targetMat);
        totalLessons = acMatCount ?? (acMatData?.length || 0);

        if (totalLessons === 0 && userItem.id) {
          const { data: acData, count: acCount } = await supabase
            .from("aulas_concluidas")
            .select("*", { count: "exact" })
            .eq("id_do_usuario", userItem.id);
          totalLessons = acCount ?? (acData?.length || 0);
        }

        if (totalLessons === 0 && userItem.id) {
          const { data: ativData, count: ativCount } = await supabase
            .from("atividades_concluidas")
            .select("*", { count: "exact" })
            .eq("id_do_usuario", userItem.id);
          totalLessons = ativCount ?? (ativData?.length || 0);
        }

        let totalCourses = 0;
        const { data: ccMatData, count: ccMatCount } = await supabase
          .from("cursos_concluidos")
          .select("*", { count: "exact" })
          .eq("matricula_usuario", targetMat);
        totalCourses = ccMatCount ?? (ccMatData?.length || 0);

        if (totalCourses === 0 && userItem.id) {
          const { data: cursosData, count: cursosCount } = await supabase
            .from("cursos_concluidos")
            .select("*", { count: "exact" })
            .eq("id_do_usuario", userItem.id);
          totalCourses = cursosCount ?? (cursosData?.length || 0);
        }

        const { data: progData } = await supabase
          .from("progresso")
          .select("*")
          .or(`matricula_usuario.eq.${targetMat}${userItem.id ? `,id_do_usuario.eq.${userItem.id}` : ""}`);
        let totalTrilhas = 0;
        if (progData && progData.length > 0) {
          totalTrilhas = progData.filter((p: any) => p.trilha_concluida || p.status === "Concluído" || p.concluido).length;
          if (totalTrilhas === 0 && (progData[0] as any)?.total_trilhas_concluidas) {
            totalTrilhas = Number((progData[0] as any).total_trilhas_concluidas) || 0;
          }
        }

        setEditingUserStats({
          completedLessons: Math.max(totalLessons, initLessons),
          completedCourses: Math.max(totalCourses, initCourses),
          completedTrilhas: Math.max(totalTrilhas, initTrilhas),
          loading: false
        });
      } catch {
        setEditingUserStats(prev => ({ ...prev, loading: false }));
      }
    } else {
      setEditingUserStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUserName.trim() || !editUserEmail.trim()) {
      alert("Por favor, preencha o nome e o e-mail.");
      return;
    }

    const emailFormatted = editUserEmail.trim().toLowerCase();
    const targetMat = editingUser.matricula || extractMatricula(editingUser.id || "", allUsers);

    setAllUsers(prev => {
      return prev.map(u => {
        if (u.id === editingUser.id || (targetMat && u.matricula === targetMat)) {
          return {
            ...u,
            name: editUserName.trim(),
            email: emailFormatted,
            account_type: editUserRole,
            acesso: editUserStatus,
            status: editUserStatus,
            status_da_conta: editUserStatus,
            motivo: editUserStatus === "Bloqueado" ? editUserMotivo.trim() : "",
            ...(editUserPassword.trim() ? { password: editUserPassword.trim() } : {})
          };
        }
        return u;
      });
    });

    if (supabase) {
      const dbRole = editUserRole === "administrador" ? "Admin" : editUserRole === "instrutor" ? "Instrutor" : "Aluno";
      try {
        const updatePayload: any = {
          nome: editUserName.trim(),
          email: emailFormatted,
          papel: dbRole,
          acesso: editUserStatus,
          motivo: editUserStatus === "Bloqueado" ? editUserMotivo.trim() : null
        };
        if (editUserStatus === "Bloqueado" && editingUser.acesso !== "Bloqueado" && editingUser.status !== "Bloqueado") {
          const currentCount = typeof editingUser.quantidades_bloqueio === "number" ? editingUser.quantidades_bloqueio : 0;
          updatePayload.quantidades_bloqueio = currentCount + 1;
        }
        if (editUserPassword.trim()) {
          updatePayload.senha = scramblePassword(editUserPassword.trim());
        }
        const { error: uErr } = await supabase.from("usuarios").update(updatePayload).eq("matricula", targetMat || editingUser.id);
        if (uErr) {
          await supabase.from("usuarios").update(updatePayload).eq("id", editingUser.id);
        }
      } catch (err) {
        console.error("Erro ao atualizar usuário em usuarios:", err);
      }
      try {
        const { error: pErr } = await supabase.from("perfis").update({
          name: editUserName.trim(),
          email: emailFormatted,
          account_type: editUserRole,
          cargo: dbRole
        }).eq("matricula_usuario", targetMat || editingUser.id);
        if (pErr) {
          await supabase.from("perfis").update({
            name: editUserName.trim(),
            email: emailFormatted,
            account_type: editUserRole,
            cargo: dbRole
          }).eq("id", editingUser.id);
        }
      } catch (err) {
        console.error("Erro ao atualizar perfil em perfis:", err);
      }
    }

    if (editingUser.id === user?.id || (user?.email && editingUser.email?.toLowerCase() === user.email.toLowerCase())) {
      setStudentName(editUserName.trim());
      setAccountType(editUserRole);
    }

    const updatedUserSnapshot = {
      ...editingUser,
      name: editUserName.trim(),
      nome: editUserName.trim(),
      email: emailFormatted,
      account_type: editUserRole,
      acesso: editUserStatus,
      status: editUserStatus,
      status_da_conta: editUserStatus,
      motivo: editUserStatus === "Bloqueado" ? editUserMotivo.trim() : ""
    };

    setEditingUser(updatedUserSnapshot);
    setEditUserPassword("");
    setShowEditUserPassword(false);
    setIsEditingUserFields(false);
    setEditUserSuccessMsg("Dados do usuário atualizados com sucesso!");
    setTimeout(() => setEditUserSuccessMsg(null), 5000);
  };

  const handleAdminCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim() || !newCourseDescription.trim()) {
      alert("Por favor, preencha o nome do curso e a descrição.");
      return;
    }

    const instructorName = newCourseInstructor.trim() || studentName || "Instrutor da Plataforma";
    const categoryName = newCourseCategory.trim() || "Desenvolvimento";
    const numLessons = parseInt(newCourseLessons) || 10;
    const lessonsLabel = newCourseLessons.trim().includes("aula") ? newCourseLessons.trim() : `${numLessons} aulas`;

    const newCourseId = `curso-db-${Date.now()}`;
    const defaultModules = [
      {
        title: "Módulo 1: Conteúdo Principal",
        lessons: Array.from({ length: Math.min(Math.max(1, numLessons), 50) }, (_, i) => ({
          title: `Aula ${i + 1}: ${newCourseTitle.trim()}`,
          duration: "15 min",
          content: `# ${newCourseTitle.trim()} - Aula ${i + 1}\n\nNesta aula do curso de **${categoryName}**, estudaremos os conceitos de **${newCourseTitle.trim()}** ministrado por **${instructorName}**.\n\n### Tópicos Abordados:\n1. Apresentação e Conceitos Iniciais\n2. Atividades e Práticas\n3. Revisão e Avaliação`,
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          quiz: [
            {
              question: `Qual é o tema principal da Aula ${i + 1}?`,
              options: [categoryName, "Teoria Geral", "Outro assunto", "Nenhum"],
              correctAnswer: 0,
              explanation: `Tema focado em ${categoryName}.`
            }
          ]
        }))
      }
    ];

    const newCourseObj: Course = {
      id: newCourseId,
      title: newCourseTitle.trim(),
      category: categoryName,
      description: newCourseDescription.trim(),
      duration: lessonsLabel,
      instructor: instructorName,
      gradientColor: newCourseGradientColor.trim() || "#ADD8E6, #000084",
      visibility: newCourseVisibility,
      lessonsCount: lessonsLabel,
      icon: "BookOpen",
      imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80",
      isCustom: true,
      modules: defaultModules
    };

    setCourses(prev => [newCourseObj, ...prev]);

    try {
      const storedCustomCourses = localStorage.getItem("aluradev_custom_courses");
      const parsed = storedCustomCourses ? JSON.parse(storedCustomCourses) : [];
      localStorage.setItem("aluradev_custom_courses", JSON.stringify([newCourseObj, ...parsed]));
    } catch (err) {
      console.error("Erro ao salvar curso no localStorage:", err);
    }

    if (supabase) {
      try {
        const payload: any = {
          nome_do_curso: newCourseTitle.trim(),
          descricao: newCourseDescription.trim(),
          categoria: categoryName,
          aulas: numLessons,
          instrutor: instructorName,
          cor_do_gradiente: newCourseGradientColor.trim() || "#ADD8E6, #000084",
          visibilidade: newCourseVisibility
        };

        let { data: insertedC, error: cErr } = await supabase
          .from("cursos")
          .insert(payload)
          .select()
          .maybeSingle();

        if (cErr) {
          console.warn("Primeira tentativa de inserção em 'cursos' com payload completo falhou, tentando fallback com campos básicos:", cErr);
          const fallbackPayload = {
            nome_do_curso: newCourseTitle.trim(),
            descricao: newCourseDescription.trim(),
            categoria: categoryName,
            instrutor: instructorName
          };
          const res = await supabase
            .from("cursos")
            .insert(fallbackPayload)
            .select()
            .maybeSingle();

          if (!res.error && res.data) {
            insertedC = res.data;
          } else {
            console.error("Erro ao inserir na tabela 'cursos' do Supabase:", res.error);
          }
        }

        if (insertedC) {
          for (let i = 1; i <= numLessons; i++) {
            await supabase.from("aulas_dos_cursos").insert({
              id_do_curso: insertedC.id,
              aula: i,
              nome_da_aula: `Aula ${i}: ${newCourseTitle.trim()}`,
              conteudo: `# ${newCourseTitle.trim()} - Aula ${i}\n\nNesta aula do curso de **${categoryName}**, estudaremos os conceitos de **${newCourseTitle.trim()}** ministrado por **${instructorName}**.`
            });
          }
        }

        // Tentar inserir também na tabela legada 'courses' se existir
        try {
          await supabase.from("courses").insert({
            title: newCourseTitle.trim(),
            description: newCourseDescription.trim(),
            category: categoryName,
            instructor: instructorName,
            is_custom: true
          });
        } catch (legacyErr) {
          console.warn("Aviso ao salvar na tabela 'courses':", legacyErr);
        }

        // Recarregar dados diretamente do Supabase
        await loadDataFromSupabase(user);
      } catch (err) {
        console.error("Erro ao inserir curso no Supabase:", err);
      }
    }

    // Reset form
    setNewCourseTitle("");
    setNewCourseDescription("");
    setNewCourseCategory("");
    setNewCourseLessons("");
    setNewCourseInstructor("");
    setNewCourseGradientColor("#ADD8E6, #000084");
    setNewCourseVisibility("Público");
    setIsCreateCourseModalOpen(false);
    alert("Curso cadastrado com sucesso!");
  };

  const handleAddClass = (className: string, courseTitle: string, instructorName: string) => {
    const newClass = {
      id: `turma-${Math.random().toString(36).substr(2, 9)}`,
      name: className,
      course_title: courseTitle,
      student_count: 0,
      instructor_name: instructorName
    };
    setClasses(prev => [newClass, ...prev]);
  };

  const handleRemoveClass = (classId: string) => {
    setClasses(prev => prev.filter(c => c.id !== classId));
  };

  const handleEnrollStudent = (classId: string) => {
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, student_count: c.student_count + 1 } : c));
  };

  const handleRemoveCourse = (courseId: string) => {
    const foundCourse = courses.find(c => c.id === courseId);
    if (foundCourse) {
      setCourseToDelete(foundCourse);
      setDeleteCoursePassword("");
      setShowDeleteCoursePassword(false);
      setDeleteCourseErrorMsg("");
    } else {
      alert("Curso não encontrado.");
    }
  };

  const handleConfirmDeleteCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseToDelete) return;

    const inputPass = deleteCoursePassword.trim();
    if (!inputPass) {
      setDeleteCourseErrorMsg("Por favor, digite sua senha de acesso para autorizar.");
      return;
    }

    const loggedInUserObj = allUsers.find(u => u.id === user?.id || u.email?.toLowerCase() === user?.email?.toLowerCase());
    const knownPass = (user as any)?.password || authPassword || loggedInUserObj?.password;

    if (knownPass && !passwordsMatch(knownPass, inputPass)) {
      setDeleteCourseErrorMsg("Senha incorreta. Por favor, digite a senha atual que você usa para fazer login.");
      return;
    }

    setIsDeletingCourse(true);
    const targetCourseId = courseToDelete.id;
    const numericId = parseInt(targetCourseId.replace("curso-db-", ""), 10);
    const targetTitle = courseToDelete.title;

    try {
      // 1. Remove course from state
      setCourses(prev => prev.filter(c => c.id !== targetCourseId));

      // 2. Remove from local custom courses list
      const storedCustomCourses = localStorage.getItem("aluradev_custom_courses");
      if (storedCustomCourses) {
        try {
          const parsed = JSON.parse(storedCustomCourses) as Course[];
          const filtered = parsed.filter(c => c.id !== targetCourseId);
          localStorage.setItem("aluradev_custom_courses", JSON.stringify(filtered));
        } catch (err) {}
      }

      // 3. Cascade deletion in Supabase (cursos, aulas_dos_cursos, progresso)
      if (supabase) {
        if (!isNaN(numericId)) {
          try {
            await supabase.from("aulas_dos_cursos").delete().eq("id_do_curso", numericId);
          } catch (err) {
            console.error("Erro ao remover aulas do curso:", err);
          }
          try {
            await supabase.from("progresso").delete().eq("id_do_curso", numericId);
          } catch (err) {
            console.error("Erro ao remover progresso do curso:", err);
          }
          try {
            await supabase.from("cursos").delete().eq("id", numericId);
          } catch (err) {
            console.error("Erro ao remover curso da tabela 'cursos':", err);
          }
        }
        try {
          await supabase.from("courses").delete().eq("id", targetCourseId);
        } catch (err) {
          console.error("Erro ao remover da tabela 'courses':", err);
        }
      }

      setCourseToDelete(null);
      setDeleteCoursePassword("");
      setDeleteCourseErrorMsg("");
      alert(`O curso "${targetTitle}" e todas as suas aulas e módulos foram excluídos com sucesso!`);
    } catch (err) {
      console.error("Erro ao excluir curso:", err);
      setDeleteCourseErrorMsg("Ocorreu um erro ao excluir o curso. Tente novamente.");
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const handleOpenEditCourse = (courseObj: Course) => {
    setEditingCourse(courseObj);
    setEditCourseTitle(courseObj.title || "");
    setEditCourseDescription(courseObj.description || "");
    setEditCourseCategory(courseObj.category || "");
    setEditCourseInstructor(courseObj.instructor || "");
    setEditCourseGradientColor(courseObj.gradientColor || "#ADD8E6, #000084");
    setEditCourseVisibility((courseObj.visibility as any) || "Público");
  };

  const handleSaveEditCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;

    if (!editCourseTitle.trim() || !editCourseDescription.trim()) {
      alert("Por favor, preencha o título e a descrição do curso.");
      return;
    }

    const updatedCourseObj: Course = {
      ...editingCourse,
      title: editCourseTitle.trim(),
      description: editCourseDescription.trim(),
      category: editCourseCategory.trim() || "Desenvolvimento",
      instructor: editCourseInstructor.trim() || "Instrutor da Plataforma",
      gradientColor: editCourseGradientColor.trim() || "#ADD8E6, #000084",
      visibility: editCourseVisibility
    };

    setCourses(prev => prev.map(c => c.id === editingCourse.id ? updatedCourseObj : c));
    if (selectedCourse?.id === editingCourse.id) {
      setSelectedCourse(updatedCourseObj);
    }

    // Update localStorage
    try {
      const storedCustomCourses = localStorage.getItem("aluradev_custom_courses");
      if (storedCustomCourses) {
        const parsed = JSON.parse(storedCustomCourses) as Course[];
        const updatedList = parsed.map(c => c.id === editingCourse.id ? updatedCourseObj : c);
        localStorage.setItem("aluradev_custom_courses", JSON.stringify(updatedList));
      }
    } catch (err) {}

    // Update Supabase
    if (supabase) {
      const numericId = parseInt(editingCourse.id.replace("curso-db-", ""), 10);
      if (!isNaN(numericId)) {
        try {
          await supabase.from("cursos").update({
            nome_do_curso: editCourseTitle.trim(),
            descricao: editCourseDescription.trim(),
            categoria: editCourseCategory.trim(),
            instrutor: editCourseInstructor.trim(),
            cor_do_gradiente: editCourseGradientColor.trim(),
            visibilidade: editCourseVisibility
          }).eq("id", numericId);
        } catch (err) {
          console.error("Erro ao atualizar curso no Supabase:", err);
        }
      }
    }

    setEditingCourse(null);
    alert("Informações do curso atualizadas com sucesso!");
  };

  const handleAddModuleOrLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleLessonCourse) return;

    let updatedCourse: Course;

    if (addType === "module") {
      if (!addModuleTitle.trim()) {
        alert("Por favor, informe o título do novo módulo.");
        return;
      }
      const newModuleObj: CourseModule = {
        title: addModuleTitle.trim(),
        lessons: [
          {
            title: `Aula 1: ${addModuleTitle.trim()}`,
            duration: "Escrito",
            content: `# ${addModuleTitle.trim()}\n\nBem-vindo a este novo módulo do curso **${moduleLessonCourse.title}**.\n\n### Conteúdo da Aula\nNesta aula de texto, você aprenderá conceitos fundamentais do módulo.`,
            videoUrl: "",
            quiz: []
          }
        ]
      };

      updatedCourse = {
        ...moduleLessonCourse,
        modules: [...(moduleLessonCourse.modules || []), newModuleObj]
      };

      setCourses(prev => prev.map(c => c.id === moduleLessonCourse.id ? updatedCourse : c));
      alert(`Módulo "${addModuleTitle.trim()}" adicionado com sucesso ao curso!`);
    } else {
      if (!addLessonTitle.trim()) {
        alert("Por favor, informe o título da nova aula.");
        return;
      }
      const newLessonObj: Lesson = {
        title: addLessonTitle.trim(),
        duration: "Escrito",
        content: addLessonContent.trim() || `# ${addLessonTitle.trim()}\n\nConteúdo escrito referente à aula **${addLessonTitle.trim()}**.`,
        videoUrl: "",
        quiz: []
      };

      const updatedModules = (moduleLessonCourse.modules || []).map((m, idx) => {
        if (idx === selectedTargetModuleIndex) {
          return {
            ...m,
            lessons: [...(m.lessons || []), newLessonObj]
          };
        }
        return m;
      });

      updatedCourse = {
        ...moduleLessonCourse,
        modules: updatedModules
      };

      setCourses(prev => prev.map(c => c.id === moduleLessonCourse.id ? updatedCourse : c));

      // Insert into Supabase if connected
      if (supabase) {
        const numericId = parseInt(moduleLessonCourse.id.replace("curso-db-", ""), 10);
        if (!isNaN(numericId)) {
          try {
            await supabase.from("aulas_dos_cursos").insert({
              id_do_curso: numericId,
              aula: (updatedModules[selectedTargetModuleIndex]?.lessons?.length || 1),
              nome_da_aula: addLessonTitle.trim(),
              conteudo: addLessonContent.trim() || `# ${addLessonTitle.trim()}\n\nConteúdo escrito referente à aula **${addLessonTitle.trim()}**.`
            });
          } catch (err) {
            console.error("Erro ao inserir aula no Supabase:", err);
          }
        }
      }

      alert(`Aula "${addLessonTitle.trim()}" adicionada com sucesso ao módulo!`);
    }

    if (selectedCourse?.id === moduleLessonCourse.id) {
      setSelectedCourse(updatedCourse);
    }

    // Persist in localStorage
    try {
      const stored = localStorage.getItem("aluradev_custom_courses");
      if (stored) {
        const parsed = JSON.parse(stored) as Course[];
        const updatedList = parsed.map(c => c.id === moduleLessonCourse.id ? updatedCourse : c);
        localStorage.setItem("aluradev_custom_courses", JSON.stringify(updatedList));
      }
    } catch (e) {}

    setAddModuleTitle("");
    setAddLessonTitle("");
    setAddLessonContent("");
    setModuleLessonCourse(null);
  };

  // Delete individual lesson
  const handleDeleteLesson = async (courseId: string, moduleIndex: number, lessonIndex: number) => {
    const courseObj = courses.find(c => c.id === courseId) || selectedCourse;
    if (!courseObj || !courseObj.modules?.[moduleIndex]?.lessons?.[lessonIndex]) return;

    const lessonTitle = courseObj.modules[moduleIndex].lessons[lessonIndex].title;
    if (!confirm(`Tem certeza que deseja excluir a aula "${lessonTitle}"?`)) return;

    const updatedModules = courseObj.modules.map((mod, mIdx) => {
      if (mIdx === moduleIndex) {
        return {
          ...mod,
          lessons: mod.lessons.filter((_, lIdx) => lIdx !== lessonIndex)
        };
      }
      return mod;
    });

    const updatedCourse: Course = {
      ...courseObj,
      modules: updatedModules
    };

    setCourses(prev => prev.map(c => c.id === courseId ? updatedCourse : c));
    if (selectedCourse?.id === courseId) {
      setSelectedCourse(updatedCourse);
    }

    try {
      const stored = localStorage.getItem("aluradev_custom_courses");
      if (stored) {
        const parsed = JSON.parse(stored) as Course[];
        const updatedList = parsed.map(c => c.id === courseId ? updatedCourse : c);
        localStorage.setItem("aluradev_custom_courses", JSON.stringify(updatedList));
      }
    } catch (e) {}

    alert(`Aula "${lessonTitle}" excluída com sucesso.`);
  };

  // Save edited lesson
  const handleSaveEditLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;

    const courseObj = courses.find(c => c.id === editingLesson.courseId) || selectedCourse;
    if (!courseObj) return;

    const updatedModules = courseObj.modules.map((mod, mIdx) => {
      if (mIdx === editingLesson.moduleIndex) {
        const updatedLessons = mod.lessons.map((les, lIdx) => {
          if (lIdx === editingLesson.lessonIndex) {
            return {
              ...les,
              title: editingLesson.title.trim(),
              content: editingLesson.content.trim()
            };
          }
          return les;
        });
        return { ...mod, lessons: updatedLessons };
      }
      return mod;
    });

    const updatedCourse: Course = {
      ...courseObj,
      modules: updatedModules
    };

    setCourses(prev => prev.map(c => c.id === editingLesson.courseId ? updatedCourse : c));
    if (selectedCourse?.id === editingLesson.courseId) {
      setSelectedCourse(updatedCourse);
    }

    try {
      const stored = localStorage.getItem("aluradev_custom_courses");
      if (stored) {
        const parsed = JSON.parse(stored) as Course[];
        const updatedList = parsed.map(c => c.id === editingLesson.courseId ? updatedCourse : c);
        localStorage.setItem("aluradev_custom_courses", JSON.stringify(updatedList));
      }
    } catch (e) {}

    setEditingLesson(null);
    alert("Aula atualizada com sucesso!");
  };




  // Helper: check if lesson is complete
  const isLessonCompleted = (courseId: string, modIdx: number, lesIdx: number) => {
    const numericCourseId = parseInt(String(courseId).replace("curso-db-", ""), 10) || 1;
    const currentCourseObj = courses.find(c => c.id === courseId) || selectedCourse;
    const lesObj = currentCourseObj?.modules?.[modIdx]?.lessons?.[lesIdx] as any;
    const calculatedDbId = lesObj?.id ? String(lesObj.id) : String(numericCourseId * 1000 + modIdx * 100 + lesIdx + 1);

    const keysToCheck = [
      `${courseId}-${modIdx}-${lesIdx}`,
      `${numericCourseId}-${modIdx}-${lesIdx}`,
      calculatedDbId
    ];
    if (lesObj?.id) {
      keysToCheck.push(String(lesObj.id));
    }

    return keysToCheck.some(k => stats.completedLessons.includes(k));
  };

  // Helper: Get unique count of completed lessons across all courses
  const getCompletedLessonsCount = () => {
    let count = 0;
    courses.forEach(course => {
      course.modules?.forEach((mod, mIdx) => {
        mod.lessons?.forEach((_, lIdx) => {
          if (isLessonCompleted(course.id, mIdx, lIdx)) {
            count++;
          }
        });
      });
    });
    return count;
  };

  // Helper for smart/fuzzy course search and filtering
  const normalizeString = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  // Helper function to check fuzzy/approximate match between token and target string
  const tokenFuzzyMatches = (token: string, targetText: string) => {
    if (!token) return true;
    if (targetText.includes(token)) return true;
    
    // For short tokens (1-2 chars), prefix or exact substring is required
    if (token.length <= 2) return false;

    // Check individual words in target text
    const words = targetText.split(/[\s,.\-\/()_:;!@#$%^&*]+/);
    return words.some((word) => {
      if (!word) return false;
      if (word.includes(token) || token.includes(word)) return true;

      // Calculate simple character distance / typo tolerance
      if (Math.abs(word.length - token.length) <= 2) {
        let errors = 0;
        let i = 0;
        let j = 0;
        while (i < word.length && j < token.length) {
          if (word[i] === token[j]) {
            i++;
            j++;
          } else {
            errors++;
            if (word.length > token.length) i++;
            else if (token.length > word.length) j++;
            else {
              i++;
              j++;
            }
          }
        }
        errors += Math.abs((word.length - i) - (token.length - j));
        const allowedErrors = token.length <= 4 ? 1 : 2;
        if (errors <= allowedErrors) return true;
      }
      return false;
    });
  };

  // Helper: compute progress and status for a Trilha
  const getTrilhaProgressStats = (trilhaId: number | string) => {
    const trilhaCourses = courses.filter(c => String(c.id_trilha) === String(trilhaId));
    const totalLessons = trilhaCourses.reduce((acc, c) => {
      const count = c.modules?.reduce((mAcc, m) => mAcc + (m.lessons?.length || 0), 0) || 0;
      return acc + count;
    }, 0);

    let completedInTrilha = 0;
    trilhaCourses.forEach(c => {
      c.modules?.forEach((m, mIdx) => {
        m.lessons?.forEach((_, lIdx) => {
          if (isLessonCompleted(c.id, mIdx, lIdx)) {
            completedInTrilha++;
          }
        });
      });
    });

    const percent = totalLessons > 0 ? Math.round((completedInTrilha / totalLessons) * 100) : 0;
    
    let status: "nao_iniciado" | "em_andamento" | "finalizado" = "nao_iniciado";
    if (totalLessons > 0 && percent === 100) {
      status = "finalizado";
    } else if (completedInTrilha > 0 && percent < 100) {
      status = "em_andamento";
    }

    return { totalLessons, completedInTrilha, percent, status, coursesCount: trilhaCourses.length };
  };

  const getFilteredCourses = () => {
    let effectiveTrilhaId = selectedTrilhaId;
    if (!effectiveTrilhaId) {
      if (selectedCourse?.id_trilha) effectiveTrilhaId = String(selectedCourse.id_trilha);
      else if (trilhas.length > 0) effectiveTrilhaId = String(trilhas[0].id);
    }
    if (!effectiveTrilhaId) {
      return [];
    }

    return courses.filter((course) => {
      // Trilha de Estudo filter
      if (course.id_trilha === undefined || course.id_trilha === null) {
        return false;
      }
      if (String(course.id_trilha) !== String(effectiveTrilhaId)) {
        return false;
      }

      // Search term: search by course name (title) or trilha name
      if (!courseSearchTerm.trim()) return true;

      const query = normalizeString(courseSearchTerm.trim());
      const queryTokens = query.split(/\s+/).filter(Boolean);

      const trilhaObj = trilhas.find(t => String(t.id) === String(course.id_trilha));
      const trilhaName = trilhaObj ? trilhaObj.nome_da_trilha : "";

      const searchableText = normalizeString(`${course.title} ${trilhaName}`);

      return queryTokens.every((token) => tokenFuzzyMatches(token, searchableText));
    });
  };

  const availableCourseCategories = [
    "Todas",
    ...Array.from(
      new Set(
        courses
          .map((c) => c.category)
          .filter((c) => Boolean(c) && normalizeString(c) !== "programacao")
      )
    )
  ];

  // Get total progress percentage of a course
  const getCourseProgress = (course: Course) => {
    let totalLessons = 0;
    let completedCount = 0;
    course.modules.forEach((mod, mIdx) => {
      mod.lessons.forEach((_, lIdx) => {
        totalLessons++;
        if (isLessonCompleted(course.id, mIdx, lIdx)) {
          completedCount++;
        }
      });
    });
    if (totalLessons === 0) return 0;
    return Math.round((completedCount / totalLessons) * 100);
  };

  // Check if entire course is completed
  const checkAndCompleteCourse = async (course: Course, updatedLessons: string[]) => {
    let allCompleted = true;
    course.modules.forEach((mod, mIdx) => {
      mod.lessons.forEach((_, lIdx) => {
        if (!updatedLessons.includes(`${course.id}-${mIdx}-${lIdx}`)) {
          allCompleted = false;
        }
      });
    });

    if (allCompleted && !stats.completedCourses.includes(course.id)) {
      const newCompletedCourses = [...stats.completedCourses, course.id];

      await saveStats({
        ...stats,
        completedCourses: newCompletedCourses
      });

      // Sync course completion to Supabase
      if (user && supabase) {
        try {
          const userMat = extractMatricula((user as any)?.matricula || user.id || "", allUsers);
          const numericCourseId = parseInt(course.id.replace("curso-db-", ""), 10);
          if (!isNaN(numericCourseId)) {
            await supabase.from("progresso").upsert({
              matricula_usuario: userMat,
              id_do_usuario: user.id,
              id_do_curso: numericCourseId,
              total_de_aulas: 10,
              aulas_concluidas: 10,
              porcentagem: 100,
              status_do_curso: "Concluído"
            });
          }

          const { error: ccErr } = await supabase.from("cursos_concluidos").insert({
            matricula_usuario: userMat,
            id_do_curso: isNaN(numericCourseId) ? course.id : numericCourseId
          });
          if (ccErr) {
            await supabase.from("cursos_concluidos").insert({
              id_do_usuario: user.id,
              id_do_curso: isNaN(numericCourseId) ? course.id : numericCourseId
            });
          }
        } catch (err) {
          console.error("Erro ao salvar curso concluído no Supabase:", err);
        }
      }

    }
  };

  // Mark lesson as complete
  const markLessonComplete = async (courseId: string, modIdx: number, lesIdx: number) => {
    const numericCourseId = parseInt(String(courseId).replace("curso-db-", ""), 10) || 1;
    const currentCourseObj = courses.find(c => c.id === courseId) || selectedCourse;
    const lessonObj = currentCourseObj?.modules?.[modIdx]?.lessons?.[lesIdx] as any;
    const lessonDbId = lessonObj?.id ? parseInt(String(lessonObj.id), 10) : (numericCourseId * 1000 + modIdx * 100 + lesIdx + 1);

    const key1 = `${courseId}-${modIdx}-${lesIdx}`;
    const key2 = `${numericCourseId}-${modIdx}-${lesIdx}`;
    const key3 = String(lessonDbId);

    if (!isLessonCompleted(courseId, modIdx, lesIdx)) {
      const updatedLessons = Array.from(new Set([...stats.completedLessons, key1, key2, key3]));

      const todayStr = new Date().toISOString().split('T')[0];
      let newStreak = stats.streak;
      if (stats.lastStudyDate && stats.lastStudyDate !== todayStr) {
        // Simple streak calculation (if yesterday, increment; if older, reset)
        const diffTime = Math.abs(new Date(todayStr).getTime() - new Date(stats.lastStudyDate).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      }

      await saveStats({
        ...stats,
        completedLessons: updatedLessons,
        streak: newStreak,
        lastStudyDate: todayStr
      });

      // Sync lesson completion to Supabase
      if (user && supabase) {
        try {
          const userMat = extractMatricula((user as any)?.matricula || user.id || "", allUsers);
          const numericCourseId = parseInt(String(courseId).replace("curso-db-", ""), 10) || 1;
          const currentCourseObj = courses.find(c => c.id === courseId) || selectedCourse;
          const lessonObj = currentCourseObj?.modules?.[modIdx]?.lessons?.[lesIdx] as any;
          const lessonDbId = lessonObj?.id ? parseInt(String(lessonObj.id), 10) : (numericCourseId * 1000 + modIdx * 100 + lesIdx + 1);

          // Standard Supabase payload: matricula_usuario & id_da_aula
          const cleanPayload = {
            matricula_usuario: userMat,
            id_da_aula: lessonDbId
          };

          // Check if already present in database to avoid duplicate rows
          const { data: existingAula } = await supabase
            .from("aulas_concluidas")
            .select("id")
            .eq("matricula_usuario", userMat)
            .eq("id_da_aula", lessonDbId)
            .limit(1)
            .maybeSingle();

          if (!existingAula) {
            const { error: errorAulas } = await supabase.from("aulas_concluidas").insert(cleanPayload);
            if (errorAulas) {
              await supabase.from("aulas_concluidas").insert({
                id_do_usuario: user.id,
                id_da_aula: lessonDbId
              });
            }
          }
        } catch (err) {
          console.error("Erro ao salvar aula concluída no Supabase:", err);
        }
      }
    }
  };

  // Get active courses in progress
  const getCoursesInProgress = () => {
    return courses.filter(c => {
      const prog = getCourseProgress(c);
      return prog > 0 && prog < 100;
    });
  };

  // Helper: Save custom generated course to Supabase
  const saveCustomCourseToSupabase = async (course: Course) => {
    if (!user || !supabase) return;
    try {
      // 1. Insert into 'cursos' table
      const totalAulas = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
      const { data: insertedC, error: cErr } = await supabase
        .from("cursos")
        .insert({
          nome_do_curso: course.title,
          descricao: course.description,
          categoria: course.category,
          aulas: totalAulas,
          instrutor: studentName,
          cor_do_gradiente: "from-blue-600 to-indigo-700",
          visibilidade: "Público"
        })
        .select()
        .maybeSingle();

      if (!cErr && insertedC) {
        let lessonCounter = 1;
        for (const mod of course.modules) {
          for (const les of mod.lessons) {
            const firstQuiz = les.quiz?.[0];
            await supabase.from("aulas_dos_cursos").insert({
              id_do_curso: insertedC.id,
              aula: lessonCounter++,
              nome_da_aula: les.title,
              conteudo: les.content,
              nome_do_teste: firstQuiz?.question || null,
              alternativa_a: firstQuiz?.options?.[0] || null,
              alternativa_b: firstQuiz?.options?.[1] || null,
              alternativa_c: firstQuiz?.options?.[2] || null,
              alternativa_d: firstQuiz?.options?.[3] || null,
              alternativa_certa: firstQuiz?.correctAnswer !== undefined ? ["A", "B", "C", "D"][firstQuiz.correctAnswer] : null
            });
          }
        }
      }

      // 2. Insert into legacy 'courses' for fallback compatibility
      try {
        await supabase.from("courses").insert({
          id: course.id,
          title: course.title,
          description: course.description,
          category: course.category,
          is_custom: true,
          user_id: user.id
        });
      } catch {}
    } catch (err) {
      console.error("Erro ao salvar curso customizado no Supabase:", err);
    }
  };

  // Handle Dynamic Course Generation with Gemini API
  const handleGenerateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim()) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(false);

    try {
      const response = await fetch("/api/courses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: customTopic.trim() })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro desconhecido ao gerar o curso.");
      }

      // Add to state and save custom course to localStorage
      const updatedCourses = [data, ...courses];
      setCourses(updatedCourses);

      const customOnly = updatedCourses.filter(c => c.isCustom);
      localStorage.setItem("aluradev_custom_courses", JSON.stringify(customOnly));

      // Sync custom course to Supabase if logged in
      if (user && supabase) {
        await saveCustomCourseToSupabase(data);
      }

      setCustomTopic("");
      setGenerationSuccess(true);
      
      // Auto open the newly generated course
      setSelectedCourse(data);
      setSelectedModuleIndex(0);
      setSelectedLessonIndex(0);
      setActiveTab("lesson-view");
    } catch (err: any) {
      setGenerationError(err.message || "Erro na conexão com o servidor. Verifique suas credenciais de IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Continue course from the first incomplete lesson
  const handleContinueCourse = (course: Course) => {
    let targetMod = 0;
    let targetLes = 0;
    let foundIncomplete = false;

    if (course.modules) {
      for (let m = 0; m < course.modules.length; m++) {
        const mod = course.modules[m];
        if (mod.lessons) {
          for (let l = 0; l < mod.lessons.length; l++) {
            if (!isLessonCompleted(course.id, m, l)) {
              targetMod = m;
              targetLes = l;
              foundIncomplete = true;
              break;
            }
          }
        }
        if (foundIncomplete) break;
      }
    }

    handleSelectLesson(course, targetMod, targetLes);
  };

  // Open course details & curriculum view (Grade do Curso)
  const handleOpenCourseInfo = (course: Course, sourceTab?: "courses" | "cursos_gestao" | "dashboard") => {
    // Se o usuário for estudante e o curso pertence a uma trilha não matriculada, exigir matrícula
    if (course.id_trilha && accountType === "estudante" && !enrolledTrilhaIds.includes(String(course.id_trilha))) {
      const courseTrilha = trilhas.find(t => String(t.id) === String(course.id_trilha));
      setSelectedTrilhaId(String(course.id_trilha));
      setActiveTab("courses");
      setEnrollModalTrilha({
        id: course.id_trilha,
        name: courseTrilha?.nome_da_trilha || "Trilha de Estudo",
        description: courseTrilha?.descricao,
        totalCourses: courses.filter(c => String(c.id_trilha) === String(course.id_trilha)).length
      });
      return;
    }

    setSelectedCourse(course);
    if (course.id_trilha) {
      setSelectedTrilhaId(String(course.id_trilha));
    }
    setSelectedModuleIndex(0);
    setSelectedLessonIndex(0);
    setIsViewingCourseInfo(true);
    if (sourceTab) {
      setCourseInfoSourceTab(sourceTab);
    } else if (activeTab === "cursos_gestao") {
      setCourseInfoSourceTab("cursos_gestao");
    } else {
      setCourseInfoSourceTab("courses");
    }
    setActiveTab("lesson-view");
  };

  // Select a lesson to view/study
  const handleSelectLesson = (course: Course, modIdx: number, lesIdx: number) => {
    // Se o usuário for estudante e o curso pertence a uma trilha não matriculada, barrar e solicitar matrícula
    if (course.id_trilha && accountType === "estudante" && !enrolledTrilhaIds.includes(String(course.id_trilha))) {
      const courseTrilha = trilhas.find(t => String(t.id) === String(course.id_trilha));
      setSelectedTrilhaId(String(course.id_trilha));
      setActiveTab("courses");
      setEnrollModalTrilha({
        id: course.id_trilha,
        name: courseTrilha?.nome_da_trilha || "Trilha de Estudo",
        description: courseTrilha?.descricao,
        totalCourses: courses.filter(c => String(c.id_trilha) === String(course.id_trilha)).length
      });
      return;
    }

    setSelectedCourse(course);
    setSelectedModuleIndex(modIdx);
    setSelectedLessonIndex(lesIdx);
    setSelectedAnswer(null);
    setQuizSubmitted(false);
    setQuizScore(null);
    setActiveTab("lesson-view");
    setIsViewingCourseInfo(false);

    // If the selected lesson doesn't have a quiz/activity AND is NOT a project submission lesson, mark as completed immediately
    const targetLes = course.modules?.[modIdx]?.lessons?.[lesIdx];
    const isProjectSubmissionLesson = targetLes?.title?.toLowerCase().includes("enviar") || 
                                       targetLes?.title?.toLowerCase().includes("projeto") || 
                                       targetLes?.title?.toLowerCase().includes("id") ||
                                       targetLes?.title?.toLowerCase().includes("estúdio") ||
                                       targetLes?.title?.toLowerCase().includes("estudio");

    if (targetLes && (!targetLes.quiz || targetLes.quiz.length === 0) && !isProjectSubmissionLesson) {
      markLessonComplete(course.id, modIdx, lesIdx);
    }
  };

  // Submit Lesson Quiz Answer
  const handleQuizSubmit = (question: QuizQuestion) => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === question.correctAnswer;
    setQuizSubmitted(true);
    setQuizScore(isCorrect);

    if (isCorrect) {
      markLessonComplete(selectedCourse!.id, selectedModuleIndex, selectedLessonIndex);
    }
  };

  // Update student name globally
  const handleUpdateStudentName = async (newName: string) => {
    setStudentName(newName);
    saveStats({
      ...stats,
      name: newName
    });
    if (user && supabase) {
      const userMat = extractMatricula((user as any)?.matricula || user.id || "", allUsers);
      try {
        const { error: uErr } = await supabase.from("usuarios").update({ nome: newName }).eq("matricula", userMat);
        if (uErr) await supabase.from("usuarios").update({ nome: newName }).eq("id", user.id);
        if (accountType === "administrador" || accountType === "instrutor") {
          const { error: pErr } = await supabase.from("perfis").update({ name: newName }).eq("matricula_usuario", userMat);
          if (pErr) await supabase.from("perfis").update({ name: newName }).eq("id", user.id);
        }
        await supabase.auth.updateUser({
          data: { nome: newName, name: newName }
        });
      } catch (err) {
        console.error("Erro ao atualizar nome do aluno no Supabase:", err);
      }
    }
  };

  // Iniciar modo de edição no perfil
  const handleStartEditProfile = () => {
    setEditProfileName(studentName);
    setEditProfileEmail(user?.email || "");
    setEditProfilePassword("");
    setShowEditProfilePassword(false);
    setProfileUpdateSuccessMsg(null);
    setProfileUpdateErrorMsg(null);
    setIsEditingProfile(true);
  };

  // Cancelar modo de edição no perfil
  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
    setEditProfilePassword("");
    setProfileUpdateErrorMsg(null);
  };

  // Enviar código de verificação para alteração de e-mail e/ou senha
  const handleSendProfileSecurityCode = async (
    currentEmail: string,
    newEmail: string,
    isPasswordChange: boolean
  ) => {
    setProfileSecurityLoading(true);
    setProfileSecurityError(null);
    try {
      const response = await fetch("/api/auth/request-profile-update-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentEmail,
          newEmail,
          isPasswordChange
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao solicitar o código de verificação.");
      }

      setProfileSecurityTimer(60); // 60 segundos para reenvio
    } catch (err: any) {
      setProfileSecurityError(err.message || "Erro ao conectar com o serviço de segurança.");
    } finally {
      setProfileSecurityLoading(false);
    }
  };

  // Submeter alterações de perfil
  const handleSaveProfileData = async () => {
    setProfileUpdateErrorMsg(null);
    setProfileUpdateSuccessMsg(null);

    const trimmedName = editProfileName.trim();
    if (!trimmedName) {
      setProfileUpdateErrorMsg("O campo Nome não pode ficar em branco.");
      return;
    }

    const currentEmail = (user?.email || "").trim().toLowerCase();
    const trimmedEmail = editProfileEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setProfileUpdateErrorMsg("Informe um endereço de e-mail válido.");
      return;
    }

    if (editProfilePassword && editProfilePassword.length < 6) {
      setProfileUpdateErrorMsg("A nova senha deve possuir no mínimo 6 caracteres.");
      return;
    }

    const isNameChanged = trimmedName !== studentName.trim();
    const isEmailChanged = trimmedEmail !== currentEmail;
    const isPasswordChanged = !!editProfilePassword.trim();

    // Se nada mudou
    if (!isNameChanged && !isEmailChanged && !isPasswordChanged) {
      setIsEditingProfile(false);
      return;
    }

    // Se alterou APENAS o nome: salva diretamente sem código de segurança!
    if (isNameChanged && !isEmailChanged && !isPasswordChanged) {
      await handleUpdateStudentName(trimmedName);
      setIsEditingProfile(false);
      setProfileUpdateSuccessMsg("Nome atualizado com sucesso!");
      setTimeout(() => setProfileUpdateSuccessMsg(null), 3500);
      return;
    }

    // Se alterou E-MAIL e/ou SENHA: exige verificação de segurança obrigatória
    setPendingProfileChanges({
      name: trimmedName,
      email: trimmedEmail,
      password: isPasswordChanged ? editProfilePassword : undefined
    });
    setProfileSecurityCode("");
    setProfileSecurityError(null);
    setIsProfileSecurityModalOpen(true);

    await handleSendProfileSecurityCode(currentEmail, trimmedEmail, isPasswordChanged);
  };

  // Confirmar código de segurança e aplicar alterações de perfil
  const handleConfirmProfileSecurityCode = async () => {
    if (!pendingProfileChanges) return;
    if (!profileSecurityCode || profileSecurityCode.trim().length !== 6) {
      setProfileSecurityError("Digite o código de 6 dígitos completo enviado para o seu e-mail.");
      return;
    }

    setProfileSecurityLoading(true);
    setProfileSecurityError(null);

    try {
      const currentEmail = (user?.email || "").trim().toLowerCase();
      const response = await fetch("/api/auth/verify-profile-update-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentEmail,
          code: profileSecurityCode.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Código de verificação incorreto ou expirado.");
      }

      // Código validado com sucesso! Agora aplica as alterações
      // 1. Atualiza Nome se mudou
      if (pendingProfileChanges.name !== studentName) {
        await handleUpdateStudentName(pendingProfileChanges.name);
      }

      // 2. Atualiza no Supabase Auth e Banco se conectado
      const updateData: { email?: string; password?: string; data?: any } = {};
      if (pendingProfileChanges.password) {
        updateData.password = pendingProfileChanges.password;
      }
      if (pendingProfileChanges.email !== currentEmail) {
        updateData.email = pendingProfileChanges.email;
      }
      updateData.data = {
        name: pendingProfileChanges.name,
        nome: pendingProfileChanges.name
      };

      if (user && supabase) {
        try {
          const { error: authError } = await supabase.auth.updateUser(updateData);
          if (authError) {
            console.warn("Aviso na atualização do Supabase Auth:", authError.message);
          }

          // Atualiza na tabela 'usuarios'
          const userMat = extractMatricula((user as any)?.matricula || user.id || "", allUsers);
          const dbUpdates: any = { nome: pendingProfileChanges.name };
          if (pendingProfileChanges.email !== currentEmail) {
            dbUpdates.email = pendingProfileChanges.email;
          }
          if (pendingProfileChanges.password) {
            dbUpdates.senha = scramblePassword(pendingProfileChanges.password);
          }
          const { error: uErr } = await supabase.from("usuarios").update(dbUpdates).eq("matricula", userMat);
          if (uErr) {
            await supabase.from("usuarios").update(dbUpdates).eq("id", user.id);
          }

          if (accountType === "administrador" || accountType === "instrutor") {
            const { error: pErr } = await supabase.from("perfis").update({
              name: pendingProfileChanges.name,
              ...(pendingProfileChanges.email !== currentEmail ? { email: pendingProfileChanges.email } : {})
            }).eq("matricula_usuario", userMat);
            if (pErr) {
              await supabase.from("perfis").update({
                name: pendingProfileChanges.name,
                ...(pendingProfileChanges.email !== currentEmail ? { email: pendingProfileChanges.email } : {})
              }).eq("id", user.id);
            }
          }
        } catch (dbErr) {
          console.error("Erro ao sincronizar dados no Supabase:", dbErr);
        }

        // Atualiza estado do user local
        setUser({
          ...user,
          email: pendingProfileChanges.email,
          user_metadata: {
            ...user.user_metadata,
            name: pendingProfileChanges.name,
            nome: pendingProfileChanges.name
          }
        });
      }

      // Conclusão com sucesso
      setIsProfileSecurityModalOpen(false);
      setIsEditingProfile(false);
      setEditProfilePassword("");
      setPendingProfileChanges(null);
      setProfileUpdateSuccessMsg("Dados atualizados com sucesso!");
      setTimeout(() => setProfileUpdateSuccessMsg(null), 4000);
    } catch (err: any) {
      setProfileSecurityError(err.message || "Erro ao validar o código de segurança.");
    } finally {
      setProfileSecurityLoading(false);
    }
  };

  // Renderizador do Modal de Termos de Uso (compartilhado entre tela de login/cadastro e tela autenticada)
  const renderTermsModal = () => (
    <AnimatePresence>
      {isTermsModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overscroll-contain pointer-events-auto"
          onClick={() => setIsTermsModalOpen(false)}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-4xl rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overscroll-contain"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-zinc-950 via-[#0b439c] to-blue-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight leading-tight">
                    Termo de Uso e Privacidade
                  </h3>
                  <p className="text-xs text-blue-100 font-medium">
                    Plataforma Educacional Programa Certo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Terms Content */}
            <div className="overflow-y-auto flex-1 overscroll-contain">
              <TermsOfUseView
                isModal={true}
                initialTab={termsModalInitialTab}
                termsCopied={termsCopied}
                onCopyTerms={handleCopyTerms}
                onClose={() => setIsTermsModalOpen(false)}
                onAcceptAndClose={() => {
                  setTermsAcceptedForSignup(true);
                  setIsTermsModalOpen(false);
                  if (authError) setAuthError(null);
                }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // Se o usuário solicitou visualização em PDF (/atendimento/[protocolo]/pdf), exibe o leitor de PDF para qualquer usuário sem exigir sessão
  if (viewingTicketPdfProtocol) {
    const ticketMatch = (blockedAccountInfo && blockedUserTicket) ? blockedUserTicket : tickets.find(t => 
      t.id.toLowerCase() === viewingTicketPdfProtocol.toLowerCase() ||
      t.id.toLowerCase().replace("#", "") === viewingTicketPdfProtocol.toLowerCase().replace("#", "") ||
      t.id.toLowerCase().replace("atend-", "") === viewingTicketPdfProtocol.toLowerCase().replace("atend-", "")
    ) || selectedTicketForDetail;

    return (
      <TicketPdfView
        protocolo={viewingTicketPdfProtocol}
        initialTicket={ticketMatch}
        onBack={() => {
          setViewingTicketPdfProtocol(null);
          if (blockedAccountInfo) {
            setBlockedViewMode("atendimento");
          } else {
            setActiveTab("atendimento");
            if (selectedTicketForDetail || viewingTicketDetailProtocol) {
              const proto = (selectedTicketForDetail?.id || viewingTicketDetailProtocol || "").replace(/^#/, "");
              if (typeof window !== "undefined") {
                window.history.pushState({}, "", `/atendimento-${proto}`);
              }
            } else {
              if (typeof window !== "undefined") {
                window.history.pushState({}, "", "/atendimento");
              }
            }
          }
          scrollToTop();
        }}
      />
    );
  }

  if (authInitializing) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0b439c] flex items-center justify-center shadow-lg shadow-blue-900/20 animate-pulse overflow-hidden">
            <img src="https://0.gravatar.com/userimage/283287275/316ae787b636086c7dcfa0d8c9ef6b77?size=256" alt="Logo Programa Certo" className="w-full h-full object-cover" />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
            <div className="w-4 h-4 border-2 border-zinc-300 border-t-[#0b439c] rounded-full animate-spin" />
            <span>Verificando sessão...</span>
          </div>
        </div>
      </div>
    );
  }

  if (blockedAccountInfo) {
    // 1. TELA INTEIRA: Central de Atendimento exclusiva para Bloqueio de Conta
    if (blockedViewMode === "atendimento") {
      const blockedInitials = getTwoNameInitials(blockedAccountInfo.name || "Usuário");
      return (
        <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans flex flex-col selection:bg-blue-100">
          {/* Header Superior: APENAS Logo Programa Certo à esquerda e Logo da Conta (Iniciais) à direita */}
          <header className="w-full bg-white border-b border-zinc-200 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
            {/* Logo e Marca Programa Certo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1 border border-zinc-200 shadow-xs flex items-center justify-center overflow-hidden">
                <img
                  src="https://0.gravatar.com/userimage/283287275/316ae787b636086c7dcfa0d8c9ef6b77?size=256"
                  alt="Logo Programa Certo"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-display font-black text-lg leading-none text-zinc-900">Programa</span>
                <span className="font-display font-bold text-sm leading-none text-[#0b439c]">Certo</span>
              </div>
            </div>

            {/* Logo da conta da pessoa (duas primeiras letras do primeiro e segundo nome). Ao clicar, NÃO FAZ NADA */}
            <div className="flex items-center gap-3">
              <div
                role="img"
                aria-label={`Conta com restrição: ${blockedAccountInfo.name || "Usuário"}`}
                title="Acesso da conta restrito pela administração"
                className="w-10 h-10 rounded-full bg-[#0b439c] text-white flex items-center justify-center font-black text-sm select-none cursor-default shadow-xs ring-2 ring-blue-100"
              >
                {blockedInitials}
              </div>
            </div>
          </header>

          {/* Conteúdo Principal em Tela Inteira */}
          <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
            {/* Cabeçalho da página */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                    Acesso Restrito
                  </span>
                  <span className="text-xs text-zinc-400 font-bold">•</span>
                  <span className="text-xs text-zinc-500 font-medium">Canal de Apelação</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight mt-1.5">
                  Atendimento de Bloqueio de Conta
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-xl">
                  Canal oficial para envio de justificativa e apelação de bloqueio da sua conta.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBlockedViewMode("motivo");
                  scrollToTop();
                }}
                className="self-start sm:self-auto px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao aviso</span>
              </button>
            </div>

            {/* Tela de Sucesso após Envio */}
            {appealSentSuccess ? (
              <div className="bg-white rounded-3xl border border-zinc-200 p-8 sm:p-12 text-center space-y-6 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-2 max-w-lg mx-auto">
                  <h2 className="text-2xl font-black text-zinc-900">
                    Chamado Registrado com Sucesso!
                  </h2>
                  <p className="text-sm text-zinc-600 leading-relaxed">
                    Sua justificativa foi protocolada com sucesso. Nossa equipe pedagógica e técnica analisará os dados do chamado e retornará pelo seu e-mail cadastrado.
                  </p>
                </div>

                {appealProtocol && (
                  <div className="inline-flex flex-col items-center bg-zinc-50 border border-zinc-200 px-6 py-3.5 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Número do Protocolo</span>
                    <span className="font-mono text-xl font-black text-[#0b439c] tracking-wider mt-0.5">{appealProtocol}</span>
                    <span className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Status: Aguardando Análise
                    </span>
                  </div>
                )}

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBlockedViewMode("detalhes");
                      scrollToTop();
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-[#0b439c] hover:bg-blue-800 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Visualizar Atendimento</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBlockedViewMode("motivo");
                      scrollToTop();
                    }}
                    className="w-full sm:w-auto px-5 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-sm rounded-xl transition-all cursor-pointer"
                  >
                    Voltar ao Aviso
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBlockedAccountInfo(null);
                      setBlockedViewMode("motivo");
                      setAuthEmail("");
                      setAuthPassword("");
                      setAuthError(null);
                    }}
                    className="w-full sm:w-auto px-4 py-3 text-zinc-500 hover:text-zinc-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    Ir ao Início
                  </button>
                </div>
              </div>
            ) : (
              /* Formulário do Chamado de Bloqueio */
              <div className="bg-white rounded-3xl border border-zinc-200/90 p-6 sm:p-8 shadow-sm space-y-6">
                {appealError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{appealError}</span>
                  </div>
                )}

                {/* Motivo Registrado Oficial */}
                <div className="p-5 bg-red-50/70 border border-red-200 rounded-2xl space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-red-700 block">
                    Motivo Oficial do Bloqueio:
                  </span>
                  <p className="text-sm font-semibold text-red-950 leading-relaxed">
                    {blockedAccountInfo.motivo || "Não foi especificado um motivo pela administração."}
                  </p>
                </div>

                {/* Informações da Conta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                      Nome do Usuário
                    </label>
                    <input
                      type="text"
                      value={blockedAccountInfo.name || "Usuário"}
                      readOnly
                      disabled
                      className="w-full bg-zinc-100/80 border border-zinc-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-zinc-700 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                      E-mail Cadastrado
                    </label>
                    <input
                      type="email"
                      value={blockedAccountInfo.email || ""}
                      readOnly
                      disabled
                      className="w-full bg-zinc-100/80 border border-zinc-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-zinc-700 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Tipo de Atendimento: Já fixo em Bloqueio de Conta */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                    Tipo de Atendimento *
                  </label>
                  <div className="p-4 rounded-2xl bg-blue-50/90 border-2 border-[#0b439c] flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg">
                        🔒
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-blue-950">Bloqueio de Conta</p>
                        <p className="text-xs text-blue-800/80 font-medium">Apelação e recurso de acesso restrito</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-[#0b439c] text-white text-[11px] font-black uppercase rounded-lg shadow-2xs">
                      Selecionado
                    </span>
                  </div>
                </div>

                {/* Justificativa / Descrição do que precisa */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-800 uppercase tracking-wider block">
                    Descreva sua justificativa / o que você precisa *
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={appealExplanation}
                    onChange={(e) => setAppealExplanation(e.target.value)}
                    placeholder="Descreva detalhadamente o ocorrido, suas razões e solicite a reconsideração do bloqueio para a equipe do Programa Certo..."
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:bg-white focus:outline-none focus:border-[#0b439c] focus:ring-2 focus:ring-blue-100 transition-all resize-y leading-relaxed font-medium"
                  />
                  <p className="text-[11px] text-zinc-400">
                    Forneça o máximo de detalhes possível para agilizar a apuração técnica da equipe.
                  </p>
                </div>

                {/* Ações */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => {
                      setBlockedViewMode("motivo");
                      scrollToTop();
                    }}
                    className="w-full sm:w-auto px-5 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={appealSending || !appealExplanation.trim()}
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!appealExplanation.trim()) {
                        setAppealError("Por favor, digite sua justificativa para análise.");
                        return;
                      }
                      setAppealSending(true);
                      setAppealError(null);
                      try {
                        const protocolNumber = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

                        try {
                          await supabase.from("suporte_ouvidoria").insert({
                            protocolo: protocolNumber,
                            user_id: blockedAccountInfo?.id || null,
                            nome: blockedAccountInfo?.name || "Usuário",
                            email: blockedAccountInfo?.email || "",
                            motivo_bloqueio: blockedAccountInfo?.motivo || "",
                            justificativa: appealExplanation.trim(),
                            status: "Em Análise",
                            criado_em: new Date().toISOString()
                          });
                        } catch (dbErr) {
                          console.warn("Tabela suporte_ouvidoria (opcional):", dbErr);
                        }

                        // Gravar EXCLUSIVAMENTE na tabela atendimentos do banco Supabase (usando matricula_usuario)
                        const clientAtend = getAtendimentoClient();
                        const blockedMat = extractMatricula(blockedAccountInfo?.matricula || blockedAccountInfo?.id || "");
                        if (clientAtend) {
                          let { error: insertErr } = await clientAtend.from("atendimentos").insert({
                            id: protocolNumber,
                            matricula_usuario: blockedMat || null,
                            nome: blockedAccountInfo?.name || "Usuário",
                            email: blockedAccountInfo?.email || "",
                            tipo: "Bloqueio de Conta",
                            mensagem: appealExplanation.trim(),
                            status: "Aguardando",
                            criado_em: new Date().toISOString()
                          });
                          if (insertErr) {
                            const validUserId = isValidUUID(blockedAccountInfo?.id) ? blockedAccountInfo?.id : null;
                            const fb = await clientAtend.from("atendimentos").insert({
                              id: protocolNumber,
                              id_do_usuario: validUserId,
                              nome: blockedAccountInfo?.name || "Usuário",
                              tipo: "Bloqueio de Conta",
                              mensagem: appealExplanation.trim(),
                              status: "Aguardando",
                              criado_em: new Date().toISOString()
                            });
                            insertErr = fb.error;
                          }
                          if (insertErr) {
                            console.error("Erro ao registrar atendimento no Supabase:", insertErr);
                            throw new Error(insertErr.message || "Erro ao registrar atendimento no banco.");
                          }
                        } else {
                          throw new Error("Conexão com o banco de atendimentos não configurada.");
                        }

                        // Garantir remoção total de localStorage (não deve ficar salvo em local history)
                        try {
                          localStorage.removeItem("programacerto_recursos");
                          const storedAtend = localStorage.getItem("programacerto_atendimentos");
                          if (storedAtend) {
                            const list: AtendimentoItem[] = JSON.parse(storedAtend);
                            const filtered = list.filter((t: any) => t.tipo !== "Bloqueio de Conta");
                            localStorage.setItem("programacerto_atendimentos", JSON.stringify(filtered));
                          }
                        } catch (e) {}

                        setAppealProtocol(protocolNumber);
                        setAppealSentSuccess(true);
                        const createdBlockedTicket: AtendimentoItem = {
                          id: protocolNumber,
                          matricula_usuario: blockedMat,
                          user_id: blockedMat || blockedAccountInfo?.id,
                          id_do_usuario: blockedMat || blockedAccountInfo?.id,
                          nome: blockedAccountInfo?.name || "Usuário",
                          email: blockedAccountInfo?.email || "",
                          tipo: "Bloqueio de Conta",
                          mensagem: appealExplanation.trim(),
                          status: "Aguardando",
                          criado_em: new Date().toISOString(),
                          atualizado_em: new Date().toISOString()
                        };
                        setBlockedUserTicket(createdBlockedTicket);
                      } catch (err: any) {
                        setAppealError(err?.message || "Erro ao registrar solicitação. Tente novamente.");
                      } finally {
                        setAppealSending(false);
                      }
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-[#0b439c] hover:bg-blue-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-blue-900/15 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {appealSending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Enviando Chamado...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Chamado de Bloqueio</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      );
    }

    // 2. TELA INTEIRA: Visualização Detalhada do Atendimento de Bloqueio de Conta (somente leitura, não editável)
    if (blockedViewMode === "detalhes" && blockedUserTicket) {
      const blockedInitials = getTwoNameInitials(blockedAccountInfo.name || blockedUserTicket?.nome || "Usuário");
      return (
        <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans flex flex-col selection:bg-blue-100">
          {/* Header Superior: APENAS Logo Programa Certo à esquerda e Logo da Conta (Iniciais) à direita */}
          <header className="w-full bg-white border-b border-zinc-200 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
            {/* Logo e Marca Programa Certo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1 border border-zinc-200 shadow-xs flex items-center justify-center overflow-hidden">
                <img
                  src="https://0.gravatar.com/userimage/283287275/316ae787b636086c7dcfa0d8c9ef6b77?size=256"
                  alt="Logo Programa Certo"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-display font-black text-lg leading-none text-zinc-900">Programa</span>
                <span className="font-display font-bold text-sm leading-none text-[#0b439c]">Certo</span>
              </div>
            </div>

            {/* Logo da conta da pessoa (duas primeiras letras do primeiro e segundo nome). Ao clicar, NÃO FAZ NADA */}
            <div className="flex items-center gap-3">
              <div
                role="img"
                aria-label={`Conta com restrição: ${blockedAccountInfo.name || "Usuário"}`}
                title="Acesso da conta restrito pela administração"
                className="w-10 h-10 rounded-full bg-[#0b439c] text-white flex items-center justify-center font-black text-sm select-none cursor-default shadow-xs ring-2 ring-blue-100"
              >
                {blockedInitials}
              </div>
            </div>
          </header>

          {/* Conteúdo Principal em Tela Inteira */}
          <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <TicketDetailView
              ticket={blockedUserTicket}
              onBack={() => {
                setBlockedViewMode("motivo");
                scrollToTop();
              }}
              onViewPdf={(t) => {
                openTicketPdfInBrowser(t);
              }}
              onDownloadPdf={(t) => {
                generateTicketPdf(t);
              }}
              isAdmin={false}
              backButtonLabel="Voltar ao aviso de bloqueio"
              showBottomBackButton={true}
            />
          </main>
        </div>
      );
    }

    // 3. TELA INICIAL DO AVISO DE CONTA BLOQUEADA
    return (
      <div className="min-h-screen bg-[#fafafa] text-zinc-900 font-sans flex flex-col items-center justify-center p-4 selection:bg-red-100">
        <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-red-200/80 shadow-2xl shadow-red-950/10 space-y-6 text-center animate-in fade-in duration-300">
          {/* Logo e Marca Programa Certo */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white p-1 border border-zinc-200 shadow-xs flex items-center justify-center overflow-hidden">
              <img
                src="https://0.gravatar.com/userimage/283287275/316ae787b636086c7dcfa0d8c9ef6b77?size=256"
                alt="Logo Programa Certo"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-display font-black text-xl leading-none text-zinc-900">Programa</span>
              <span className="font-display font-bold text-base leading-none text-[#0b439c]">Certo</span>
            </div>
          </div>

          {/* Ícone e Cabeçalho de Erro de Bloqueio */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-xs">
              <ShieldAlert className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                Acesso Bloqueado
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                Esta conta está com restrição de acesso na plataforma.
              </p>
            </div>
          </div>

          {/* Motivo do Bloqueio */}
          <div className="bg-red-50/70 border border-red-200 rounded-2xl p-5 text-left space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-red-700 block">
              Motivo do Bloqueio:
            </span>
            <p className="text-sm text-red-950 font-semibold leading-relaxed break-words">
              {blockedAccountInfo.motivo || "Não foi especificado um motivo pela administração."}
            </p>
            {blockedAccountInfo.email && (
              <p className="text-[11px] text-red-600/90 pt-1 border-t border-red-200/60">
                Conta: <span className="font-bold">{blockedAccountInfo.email}</span>
              </p>
            )}
          </div>

          {/* Se a pessoa já tem um atendimento, NÃO mostra o botão; exibe o card do atendimento dela daquele jeitinho da Central de Atendimento */}
          {loadingBlockedTicket && !blockedUserTicket ? (
            <div className="py-4 flex items-center justify-center gap-2 text-xs font-bold text-zinc-500 bg-zinc-50 rounded-2xl border border-zinc-200/80">
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-[#0b439c] rounded-full animate-spin" />
              <span>Verificando atendimentos anteriores...</span>
            </div>
          ) : blockedUserTicket ? (
            <div className="text-left space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider">
                  Seu Atendimento Registrado
                </span>
                <span className="text-[10px] font-bold text-zinc-400">
                  1 chamado ativo
                </span>
              </div>

              {/* Card do Atendimento exatamente como na Central de Atendimento */}
              {(() => {
                let typeBadgeStyle = "bg-red-50 text-red-700 border-red-200";
                if (blockedUserTicket.tipo === "Sugestão") typeBadgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
                else if (blockedUserTicket.tipo === "Dúvida") typeBadgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                else if (blockedUserTicket.tipo === "Problema Técnico") typeBadgeStyle = "bg-orange-50 text-orange-700 border-orange-200";
                else if (blockedUserTicket.tipo === "Reclamação") typeBadgeStyle = "bg-amber-50 text-amber-800 border-amber-200";

                let statusBadge = (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Aguardando Análise
                  </span>
                );
                if (blockedUserTicket.status === "Em Andamento") {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                      Em Andamento
                    </span>
                  );
                } else if (blockedUserTicket.status === "Concluído") {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Concluído
                    </span>
                  );
                }

                const dateFormatted = new Date(blockedUserTicket.criado_em).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div
                    onClick={() => {
                      setBlockedViewMode("detalhes");
                      scrollToTop();
                    }}
                    className="bg-zinc-50 hover:bg-zinc-100/90 rounded-2xl border border-zinc-200/90 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all p-4 flex flex-col gap-3.5 cursor-pointer group"
                  >
                    {/* Linha Principal: Tipo, Protocolo, Data */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${typeBadgeStyle}`}>
                        {blockedUserTicket.tipo || "Bloqueio de Conta"}
                      </span>
                      <span className="font-mono text-xs font-bold text-zinc-700 bg-white px-2.5 py-1 rounded-lg border border-zinc-200/70">
                        #{blockedUserTicket.id.replace(/^#/, "")}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">
                        • {dateFormatted}
                      </span>
                    </div>

                    {/* Status e Botão de Ação "Ver" */}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-200/60">
                      <div>{statusBadge}</div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBlockedViewMode("detalhes");
                          scrollToTop();
                        }}
                        className="px-4 py-2 bg-blue-50 group-hover:bg-[#0b439c] text-[#0b439c] group-hover:text-white border border-blue-200 group-hover:border-[#0b439c] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <p className="text-[11px] text-zinc-500 font-medium text-center pt-0.5">
                Você já possui este atendimento em análise. Para evitar filas e duplicidades, aguarde o retorno da equipe antes de registrar novos chamados.
              </p>
            </div>
          ) : (
            /* Se ainda NÃO possui atendimento, exibe o botão da Central de Atendimento */
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setBlockedViewMode("atendimento");
                  setAppealError(null);
                  setAppealSentSuccess(false);
                  setAppealExplanation("");
                  scrollToTop();
                }}
                className="w-full py-3.5 px-4 bg-[#0b439c] hover:bg-blue-800 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-900/15 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <LifeBuoy className="w-5 h-5 text-white" />
                <span>Central de Atendimento</span>
              </button>
              <p className="text-[11px] text-zinc-500 font-medium">
                Considera que a restrição foi indevida? Submeta um recurso para análise da equipe.
              </p>
            </div>
          )}

          {/* Botão Voltar para a tela inicial */}
          <button
            type="button"
            onClick={() => {
              setBlockedAccountInfo(null);
              setBlockedViewMode("motivo");
              setAuthEmail("");
              setAuthPassword("");
              setAuthError(null);
            }}
            className="w-full py-2.5 px-4 text-zinc-500 hover:text-zinc-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a tela inicial</span>
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans flex flex-col selection:bg-blue-100">
        <div className="flex-1 grid lg:grid-cols-12 min-h-screen">
          {/* Left Column: Branding & Value Proposition */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-indigo-950 via-[#0b439c] to-blue-900 text-white p-12 flex-col justify-between relative overflow-hidden">
            {/* Subtle Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="absolute top-1/4 right-0 w-80 h-80 bg-blue-500/10 rounded-full filter blur-3xl" />
            
            <div className="relative z-10 space-y-12">
              {/* Brand Logo */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded bg-white p-0.5 flex items-center justify-center shadow-lg shadow-blue-950/25 overflow-hidden">
                  <img src="https://0.gravatar.com/userimage/283287275/316ae787b636086c7dcfa0d8c9ef6b77?size=256" alt="Logo Programa Certo" className="w-full h-full object-cover rounded" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-display font-black text-2xl leading-none tracking-tight">Programa</span>
                  <span className="font-display font-bold text-lg leading-none text-blue-200">Certo</span>
                </div>
              </div>

              {/* Tagline */}
              <div className="space-y-4">
                <h1 className="text-3xl font-black tracking-tight leading-tight">
                  Aprenda Programação na Prática
                </h1>
                <p className="text-blue-100/80 text-sm leading-relaxed max-w-md">
                  Seu portal interativo com cursos estruturados, editor de código integrado e projetos práticos para dominar a tecnologia.
                </p>
              </div>

              {/* Value list */}
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="p-2 rounded-lg bg-white/10 text-blue-300">
                    <Code className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Editor & Projetos Práticos</h4>
                    <p className="text-xs text-blue-200/70 mt-1 leading-relaxed">
                      Escreva, teste e execute seus códigos diretamente no navegador com nosso ambiente de desenvolvimento de projetos.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 text-xs text-blue-200/50 flex flex-col gap-1">
              <p className="font-semibold text-blue-200/70">Programa Certo © 2026</p>
            </div>
          </div>

          {/* Right Column: Interactive Login/SignUp Card */}
          <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 md:p-16 bg-white relative">
            <div className="w-full max-w-md space-y-8">
              {/* Header on mobile */}
              <div className="lg:hidden flex items-center gap-2.5 justify-center mb-6">
                <div className="w-9 h-9 rounded bg-[#0b439c] flex items-center justify-center text-white font-black text-lg tracking-tighter">
                  P<span className="text-blue-300">C</span>
                </div>
                <span className="font-display font-black text-lg text-[#0b439c]">Programa Certo</span>
              </div>

              {/* Form header */}
              <div className="text-center lg:text-left">
                <h2 className="font-display font-black text-2xl sm:text-3xl text-zinc-900 tracking-tight leading-none">
                  {authMode === "forgot" ? "Redefinir Senha" : "Acesso Administrativo"}
                </h2>
                <p className="text-sm text-zinc-500 mt-2">
                  {authMode === "forgot"
                    ? forgotStep === 1
                      ? "Informe o e-mail cadastrado na sua conta para receber o código de segurança."
                      : forgotStep === 2
                        ? "Insira o código de 6 dígitos enviado para seu e-mail."
                        : "Defina sua nova senha de acesso à plataforma."
                    : "Painel exclusivo para administradores e instrutores autorizados. Entre com suas credenciais."
                  }
                </p>
              </div>

              {/* Deep link course target notice */}
              {authMode !== "forgot" && (targetRouteRef.current?.courseSlug || (typeof window !== "undefined" && sessionStorage.getItem("aluradev_target_course"))) && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 text-[#0b439c] text-xs flex items-center gap-2.5 shadow-2xs">
                  <GraduationCap className="w-5 h-5 shrink-0 text-[#0b439c]" />
                  <span className="font-semibold leading-relaxed">
                    Você está acessando um curso com link direto. Faça login para gerenciar o conteúdo imediatamente.
                  </span>
                </div>
              )}

              {/* Auth error banner */}
              {authMode !== "forgot" && authError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs shadow-xs space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-semibold">{authError}</span>
                  </div>
                </div>
              )}

              {/* --- FLUXO DE REDEFINIÇÃO DE SENHA (DIRETO NO CARTÃO) --- */}
              {authMode === "forgot" ? (
                <div className="space-y-5">
                  {/* Banners de erro ou sucesso */}
                  {forgotError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex flex-col gap-2.5 shadow-xs">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed font-semibold">{forgotError}</span>
                      </div>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 shadow-xs">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-semibold">{forgotSuccess}</span>
                    </div>
                  )}

                  {/* ETAPA 1: Inserir e-mail */}
                  {forgotStep === 1 && (
                    <form onSubmit={handleRequestResetCode} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                          Endereço de E-mail
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input
                            type="email"
                            required
                            value={forgotEmail}
                            onChange={(e) => {
                              setForgotEmail(e.target.value);
                              if (forgotError) setForgotError(null);
                              if (emailNotRegistered) setEmailNotRegistered(false);
                            }}
                            placeholder="seu.email@exemplo.com"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs font-medium"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full py-3 px-4 bg-[#0b439c] hover:bg-blue-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 cursor-pointer mt-3"
                      >
                        {forgotLoading ? (
                          <div className="w-5 h-5 border-2 border-zinc-300 border-t-white rounded-full animate-spin" />
                        ) : (
                          "Enviar Código"
                        )}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("login");
                            setForgotError(null);
                            setEmailNotRegistered(false);
                          }}
                          className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                        >
                          ← Voltar para o Login
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ETAPA 2: Apenas a caixa de inserir o código de 6 dígitos! */}
                  {forgotStep === 2 && (
                    <div className="space-y-4">
                      {/* Box informando o e-mail e tempo de 15 minutos */}
                      <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-950 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="min-w-0">
                          <span className="text-blue-700 block text-[11px] font-medium">Código enviado para:</span>
                          <span className="font-bold text-zinc-900 truncate block">{forgotEmail}</span>
                        </div>
                        {forgotTimer > 0 ? (
                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-blue-600 block font-medium">Expira em</span>
                            <span className="font-mono font-black text-blue-800 text-xs">
                              {formatTimer(forgotTimer)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-red-600 shrink-0">Expirado</span>
                        )}
                      </div>

                      {/* Apenas a caixa de inserir o código */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block text-center">
                          Código de Segurança (6 dígitos)
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          autoFocus
                          value={forgotCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setForgotCode(val);
                            setForgotError(null);
                            if (val.length === 6) {
                              handleVerifyCode(val);
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                            if (pasted) {
                              setForgotCode(pasted);
                              setForgotError(null);
                              if (pasted.length === 6) {
                                handleVerifyCode(pasted);
                              }
                            }
                          }}
                          placeholder="000000"
                          className="w-full bg-zinc-50 border-2 border-zinc-300 focus:border-[#0b439c] focus:bg-white rounded-2xl py-3 text-center font-mono font-black text-3xl tracking-[0.45em] text-zinc-900 outline-none transition-all shadow-xs"
                        />
                        <p className="text-[11px] text-zinc-400 text-center">
                          Digite ou cole o código recebido no seu e-mail.
                        </p>
                      </div>

                      {/* Botão Continuar: fica cinza desabilitado se < 6 dígitos, e fica azul quando preenchido */}
                      <button
                        type="button"
                        onClick={() => handleVerifyCode(forgotCode)}
                        disabled={forgotCode.length !== 6 || forgotLoading}
                        className={`w-full py-3 px-4 font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                          forgotCode.length === 6 && !forgotLoading
                            ? "bg-[#0b439c] hover:bg-blue-800 text-white cursor-pointer shadow-md shadow-blue-900/10"
                            : "bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-200"
                        }`}
                      >
                        {forgotLoading ? (
                          <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "Continuar"
                        )}
                      </button>

                      <div className="flex items-center justify-between pt-2 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setForgotStep(1);
                            setForgotError(null);
                          }}
                          className="font-semibold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                        >
                          ← Trocar e-mail
                        </button>

                        <button
                          type="button"
                          onClick={handleRequestResetCode}
                          disabled={forgotLoading}
                          className="font-bold text-[#0b439c] hover:underline transition-colors cursor-pointer"
                        >
                          Reenviar código
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ETAPA 3: Apenas agora aparecem os campos de Nova Senha! */}
                  {forgotStep === 3 && (
                    <form onSubmit={handleCompleteResetPassword} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                          Nova Senha
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input
                            type={showForgotNewPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={forgotNewPassword}
                            onChange={(e) => setForgotNewPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-11 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 focus:outline-none rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer flex items-center justify-center"
                            title={showForgotNewPassword ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                          Confirmar Nova Senha
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input
                            type={showForgotConfirmPassword ? "text" : "password"}
                            required
                            minLength={6}
                            value={forgotConfirmPassword}
                            onChange={(e) => setForgotConfirmPassword(e.target.value)}
                            placeholder="Repita a nova senha"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-11 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 focus:outline-none rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer flex items-center justify-center"
                            title={showForgotConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full py-3 px-4 bg-[#0b439c] hover:bg-blue-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 cursor-pointer mt-3"
                      >
                        {forgotLoading ? (
                          <div className="w-5 h-5 border-2 border-zinc-300 border-t-white rounded-full animate-spin" />
                        ) : (
                          "Salvar Nova Senha e Entrar"
                        )}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("login");
                            setForgotError(null);
                          }}
                          className="text-xs font-bold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                        >
                          ← Voltar para o Login
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* --- FORMULÁRIO EXCLUSIVO DE LOGIN ADMINISTRATIVO --- */
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                      Endereço de E-mail
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => {
                          setAuthEmail(e.target.value);
                          if (authError) setAuthError(null);
                          if (loginEmailNotRegistered) setLoginEmailNotRegistered(false);
                        }}
                        placeholder="admin@exemplo.com"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                      Senha de Acesso
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={authPassword}
                        onChange={(e) => {
                          setAuthPassword(e.target.value);
                          if (authError) setAuthError(null);
                        }}
                        placeholder="Sua senha de acesso"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-11 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 focus:outline-none rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer flex items-center justify-center"
                        title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("forgot");
                        setForgotStep(1);
                        setForgotEmail(authEmail || "");
                        setForgotCode("");
                        setForgotNewPassword("");
                        setForgotConfirmPassword("");
                        setForgotError(null);
                        setForgotSuccess(null);
                        setEmailNotRegistered(false);
                        scrollToTop();
                      }}
                      className="text-xs font-bold text-[#0b439c] hover:text-blue-800 hover:underline transition-colors cursor-pointer py-1"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 px-4 bg-[#0b439c] hover:bg-blue-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 cursor-pointer mt-3"
                  >
                    {authLoading ? (
                      <div className="w-5 h-5 border-2 border-zinc-300 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Entrar"
                    )}
                  </button>
                </form>
              )}

              {/* Informação institucional de segurança */}
              <div className="pt-2 text-center">
                <p className="text-xs text-zinc-500 font-medium">
                  Acesso restrito ao painel de administração e instrução do Programa Certo.
                </p>
                <p className="text-[10px] text-zinc-400 mt-2 leading-relaxed max-w-xs mx-auto">
                  A criação e a permissão de contas são gerenciadas exclusivamente pela administração do sistema.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Termos de Uso no Fluxo de Cadastro e Boas-Vindas */}
        {renderTermsModal()}
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#fafafa] text-zinc-950 font-sans flex flex-col selection:bg-blue-100">
      {/* Camada Base da Página (Inativa e travada quando qualquer camada superior/modal/menu lateral está aberta) */}
      <div
        id="background-page-layer"
        className={`flex-1 flex flex-col md:flex-row w-full h-full overflow-hidden ${
          isAnyModalOpen ? "pointer-events-none select-none" : ""
        }`}
        aria-hidden={isAnyModalOpen ? true : undefined}
        inert={isAnyModalOpen ? true : undefined}
      >
        {/* Barra Lateral Fixa no Desktop (Camada com rolagem própria e isolada) */}
        <aside
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className="hidden md:flex md:w-[280px] lg:w-[300px] bg-white border-r border-zinc-200 flex-col shrink-0 h-full z-30 overflow-hidden"
        >
            {/* Topo da Barra Lateral: Logo Programa Certo (Apenas visual, não clicável) */}
            <div className="p-5 border-b border-zinc-200 flex items-center gap-3 bg-zinc-50/70 select-none cursor-default shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[#0b439c] flex items-center justify-center shadow-md shadow-blue-900/10 overflow-hidden shrink-0">
                <img
                  src="https://0.gravatar.com/userimage/283287275/316ae787b636086c7dcfa0d8c9ef6b77?size=256"
                  alt="Logo Programa Certo"
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display font-black text-base text-[#0b439c] leading-none tracking-tight">
                  Programa Certo
                </span>
                <span className="font-display font-semibold text-[11px] text-zinc-500 leading-none mt-1">
                  Painel Administrativo
                </span>
              </div>
            </div>

            {/* Cartão do Administrador Conectado (Apenas visual, não clicável) */}
            <div className="p-4 mx-4 mt-4 bg-blue-50/80 border border-blue-100 rounded-2xl flex items-center gap-3 select-none cursor-default shrink-0">
              <div className="w-10 h-10 rounded-full bg-[#0b439c] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                {studentName.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "AD"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-zinc-900 text-sm truncate" title={studentName}>
                  {studentName}
                </p>
                <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-200/70 text-[#0b439c] mt-0.5">
                  Administrador
                </span>
              </div>
            </div>

            {/* Menu de Navegação Lateral (Rolagem exclusiva da barra lateral) */}
            <div className="p-4 space-y-1.5 flex-1 overflow-y-auto overscroll-contain">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-3 mb-2 select-none">
                Gestão e Administração
              </p>

              <button
                type="button"
                onClick={() => navigateToTab("dashboard")}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-[#0b439c] text-white shadow-md shadow-blue-900/10"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <Compass className="w-5 h-5 shrink-0" />
                <span>DASHBOARD</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToTab("usuarios")}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                  activeTab === "usuarios"
                    ? "bg-[#0b439c] text-white shadow-md shadow-blue-900/10"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <Users className="w-5 h-5 shrink-0" />
                <span>USUÁRIOS</span>
              </button>


              <button
                type="button"
                onClick={() => navigateToTab("atendimento")}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                  activeTab === "atendimento"
                    ? "bg-[#0b439c] text-white shadow-md shadow-blue-900/10"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <LifeBuoy className="w-5 h-5 shrink-0" />
                <span>CENTRAL DE ATENDIMENTO</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToTab("documentos")}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                  activeTab === "documentos"
                    ? "bg-[#0b439c] text-white shadow-md shadow-blue-900/10"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <FileText className="w-5 h-5 shrink-0" />
                <span>DOCUMENTOS</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToTab("ocorrencias")}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                  activeTab === "ocorrencias"
                    ? "bg-[#0b439c] text-white shadow-md shadow-blue-900/10"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <ShieldAlert className="w-5 h-5 shrink-0 text-red-500" />
                <span>OCORRÊNCIAS</span>
              </button>

              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-3 mt-5 mb-2 select-none">
                Minha Conta
              </p>

              <button
                type="button"
                onClick={() => navigateToTab("perfil")}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all text-left cursor-pointer ${
                  activeTab === "perfil" ? "bg-[#0b439c] text-white shadow-md shadow-blue-900/10" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <User className={`w-5 h-5 shrink-0 ${activeTab === "perfil" ? "text-white" : "text-zinc-500"}`} />
                <span>Meu Perfil</span>
              </button>

              <button
                type="button"
                onClick={() => navigateToTab("termos")}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all text-left cursor-pointer ${
                  activeTab === "termos" ? "bg-[#0b439c] text-white shadow-md shadow-blue-900/10" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <FileText className={`w-5 h-5 shrink-0 ${activeTab === "termos" ? "text-white" : "text-zinc-500"}`} />
                <span>Termo de Uso e Privacidade</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleLogout();
                }}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all text-left cursor-pointer text-zinc-700 hover:bg-zinc-100 hover:text-red-600"
              >
                <LogOut className="w-5 h-5 shrink-0 text-zinc-500" />
                <span>Sair da Conta</span>
              </button>
            </div>
          </aside>

        {/* Container da Tela / Página Principal (Com rolagem própria e prioridade exclusiva da tela aberta) */}
        <div
          id="main-scroll-container"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className={`flex-1 flex flex-col min-w-0 w-full h-full ${
            isAnyModalOpen ? "overflow-hidden" : "overflow-y-auto overscroll-contain"
          }`}
        >
          {/* Top Bar para Telas Pequenas / Mobile */}
          <header className="md:hidden w-full bg-white border-b border-zinc-200 h-16 flex items-center justify-between px-4 sticky top-0 z-30 shrink-0 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2.5 rounded-xl hover:bg-zinc-100 text-zinc-700 transition-colors border border-zinc-200 cursor-pointer flex items-center justify-center shrink-0"
                  aria-label="Abrir menu de navegação"
                >
                  <Menu className="w-5 h-5 text-zinc-800" />
                </button>

                {/* Logo Programa Certo: Apenas visual, ao clicar NÃO FAZ NADA */}
                <div className="flex items-center gap-2.5 select-none cursor-default">
                  <div className="w-9 h-9 rounded-lg bg-[#0b439c] flex items-center justify-center shadow-sm overflow-hidden">
                    <img
                      src="https://0.gravatar.com/userimage/283287275/316ae787b636086c7dcfa0d8c9ef6b77?size=256"
                      alt="Logo Programa Certo"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display font-black text-base text-[#0b439c] leading-none">
                      Programa Certo
                    </span>
                    <span className="font-display font-semibold text-[10px] text-zinc-500 leading-none mt-0.5">
                      Painel Administrativo
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações de Conta Mobile: Botão Sair e Iniciais */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await handleLogout();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
                  title="Sair da Conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
                <div
                  role="img"
                  aria-label={`Administrador: ${studentName}`}
                  className="w-9 h-9 rounded-full bg-[#0b439c] text-white flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm select-none cursor-default"
                >
                  {studentName.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "AD"}
                </div>
              </div>
            </header>



          {/* Main Content Body */}
          <main className="flex-1 p-6 sm:p-8">
        
        {/* ==================== TAB 1: DASHBOARD ADMINISTRATIVO ==================== */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Perfis Registrados */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-[#0b439c] rounded-xl shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs text-zinc-500 font-bold uppercase tracking-wider truncate">Perfis Registrados</span>
                  <strong className="text-2xl font-display font-black text-zinc-900">{allUsers.length}</strong>
                </div>
              </div>

              {/* Card 2: Total de Atendimentos */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-700 rounded-xl shrink-0">
                  <LifeBuoy className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs text-zinc-500 font-bold uppercase tracking-wider truncate">Total de Atendimentos</span>
                  <strong className="text-2xl font-display font-black text-zinc-900">{tickets.length}</strong>
                </div>
              </div>

              {/* Card 3: Aguardando Resposta */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs text-zinc-500 font-bold uppercase tracking-wider truncate">Aguardando Resposta</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-2xl font-display font-black text-amber-900">
                      {tickets.filter(t => t.status === "Aguardando" || t.status === "Pendente").length}
                    </strong>
                    {tickets.filter(t => t.tipo === "Bloqueio de Conta" && (t.status === "Aguardando" || t.status === "Pendente")).length > 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                        {tickets.filter(t => t.tipo === "Bloqueio de Conta" && (t.status === "Aguardando" || t.status === "Pendente")).length} bloqueios
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 4: Chamados Concluídos */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs text-zinc-500 font-bold uppercase tracking-wider truncate">Atendimentos Concluídos</span>
                  <strong className="text-2xl font-display font-black text-emerald-900">
                    {tickets.filter(t => t.status === "Concluído").length}
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick Access Control Board */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-display font-bold text-base text-zinc-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Atalhos de Gestão da Plataforma
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  type="button"
                  onClick={() => navigateToTab("usuarios")}
                  className="p-5 bg-zinc-50 hover:bg-blue-50/50 border border-zinc-200 hover:border-blue-300 rounded-2xl transition-all text-left space-y-1.5 group cursor-pointer"
                >
                  <Users className="w-5 h-5 text-[#0b439c] group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-sm text-zinc-900">Controle de Usuários</h4>
                  <p className="text-xs text-zinc-500">Visualizar contas cadastradas, cargos e status de acesso (Liberado ou Bloqueado).</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigateToTab("atendimento")}
                  className="p-5 bg-zinc-50 hover:bg-blue-50/50 border border-zinc-200 hover:border-blue-300 rounded-2xl transition-all text-left space-y-1.5 group cursor-pointer"
                >
                  <LifeBuoy className="w-5 h-5 text-[#0b439c] group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-sm text-zinc-900">Central de Atendimento</h4>
                  <p className="text-xs text-zinc-500">Fila prioritária de chamados, apelações de bloqueio de conta e respostas oficiais.</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigateToTab("documentos")}
                  className="p-5 bg-zinc-50 hover:bg-blue-50/50 border border-zinc-200 hover:border-blue-300 rounded-2xl transition-all text-left space-y-1.5 group cursor-pointer"
                >
                  <FileText className="w-5 h-5 text-[#0b439c] group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-sm text-zinc-900">Documentos</h4>
                  <p className="text-xs text-zinc-500">Emissão e controle de folhas timbradas, comunicados e ofícios da instituição.</p>
                </button>

                <button
                  type="button"
                  onClick={() => navigateToTab("ocorrencias")}
                  className="p-5 bg-zinc-50 hover:bg-red-50/50 border border-zinc-200 hover:border-red-300 rounded-2xl transition-all text-left space-y-1.5 group cursor-pointer"
                >
                  <ShieldAlert className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-sm text-zinc-900">Ocorrências</h4>
                  <p className="text-xs text-zinc-500">Auditoria de infrações, tentativas de cópia/impressão e avisos de segurança.</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB: TRILHAS DE ESTUDO ==================== */}
        {activeTab === "trilhas" && (
          <div className="space-y-6">
            {/* Feedback notification banner after enrollment */}
            {enrollSuccessMessage && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{enrollSuccessMessage}</span>
                </div>
                <button
                  onClick={() => setEnrollSuccessMessage(null)}
                  className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Header / Intro section & Filter Tabs */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#0b439c]" />
                  <h2 className="text-lg font-black text-zinc-900 font-display">Meus Estudos</h2>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">
                  Acompanhe e gerencie as trilhas de estudo em que você está matriculado(a). Cada trilha organiza os cursos passo a passo para sua formação completa.
                </p>
              </div>

              {/* Action Buttons & Status Filter Tabs */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Botão Adicionar Trilha de Estudo */}
                <button
                  onClick={() => setIsAddTrilhaModalOpen(true)}
                  className="px-4 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Trilha de Estudo</span>
                </button>

                {enrolledTrilhaIds.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap bg-zinc-100 p-1.5 rounded-xl border border-zinc-200/80">
                    <button
                      onClick={() => setTrilhaStatusFilter("todos")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        trilhaStatusFilter === "todos"
                          ? "bg-white text-[#0b439c] shadow-xs border border-zinc-200"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      Todos ({trilhas.filter(t => enrolledTrilhaIds.includes(String(t.id))).length})
                    </button>
                    <button
                      onClick={() => setTrilhaStatusFilter("em_andamento")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        trilhaStatusFilter === "em_andamento"
                          ? "bg-amber-50 text-amber-800 shadow-xs border border-amber-200"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      Em andamento ({trilhas.filter(t => enrolledTrilhaIds.includes(String(t.id)) && getTrilhaProgressStats(t.id).status === "em_andamento").length})
                    </button>
                    <button
                      onClick={() => setTrilhaStatusFilter("finalizado")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        trilhaStatusFilter === "finalizado"
                          ? "bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200"
                          : "text-zinc-600 hover:text-zinc-900"
                      }`}
                    >
                      Finalizados ({trilhas.filter(t => enrolledTrilhaIds.includes(String(t.id)) && getTrilhaProgressStats(t.id).status === "finalizado").length})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Search input for enrolled trilhas */}
            {trilhas.filter(t => enrolledTrilhaIds.includes(String(t.id))).length > 0 && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={trilhaSearchTerm}
                    onChange={(e) => setTrilhaSearchTerm(e.target.value)}
                    placeholder="Pesquisar entre as suas trilhas matriculadas..."
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white text-zinc-900 text-xs font-medium rounded-xl pl-10 pr-9 py-2.5 outline-none transition-all"
                  />
                  {trilhaSearchTerm && (
                    <button
                      onClick={() => setTrilhaSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full hover:bg-zinc-200 transition-colors cursor-pointer"
                      title="Limpar pesquisa"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Enrolled Trilhas List */}
            {(() => {
              const enrolledTrilhas = trilhas.filter(t => enrolledTrilhaIds.includes(String(t.id)));

              if (enrolledTrilhas.length === 0) {
                return (
                  <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0b439c] flex items-center justify-center mx-auto shadow-xs">
                      <GraduationCap className="w-7 h-7" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h4 className="font-bold text-zinc-900 text-base">Nenhuma trilha adicionada aos Meus Estudos</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Você ainda não se matriculou em nenhuma trilha de estudo. Adicione trilhas do catálogo para organizar seus estudos passo a passo.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => setIsAddTrilhaModalOpen(true)}
                        className="px-5 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar Trilha de Estudo</span>
                      </button>
                    </div>
                  </div>
                );
              }

              const filteredEnrolledTrilhas = enrolledTrilhas.filter(t => {
                // Status filter
                if (trilhaStatusFilter !== "todos") {
                  const stat = getTrilhaProgressStats(t.id);
                  if (trilhaStatusFilter === "em_andamento" && stat.status !== "em_andamento") return false;
                  if (trilhaStatusFilter === "finalizado" && stat.status !== "finalizado") return false;
                }

                // Search term filter
                if (!trilhaSearchTerm.trim()) return true;
                const term = normalizeString(trilhaSearchTerm.trim());
                return normalizeString(t.nome_da_trilha).includes(term) || normalizeString(t.descricao || "").includes(term);
              });

              if (filteredEnrolledTrilhas.length === 0) {
                return (
                  <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
                    <GraduationCap className="w-12 h-12 text-zinc-300 mx-auto" />
                    <h3 className="text-base font-bold text-zinc-800">Nenhuma trilha encontrada nos Meus Estudos</h3>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      {trilhaSearchTerm.trim()
                        ? `Não encontramos nenhuma trilha matriculada correspondente a "${trilhaSearchTerm}".`
                        : trilhaStatusFilter === "em_andamento"
                        ? "Você ainda não possui trilhas em andamento."
                        : trilhaStatusFilter === "finalizado"
                        ? "Você ainda não concluiu nenhuma trilha de estudo 100%."
                        : "Nenhuma trilha encontrada nesta categoria."}
                    </p>
                    {(trilhaSearchTerm.trim() || trilhaStatusFilter !== "todos") && (
                      <button
                        onClick={() => {
                          setTrilhaSearchTerm("");
                          setTrilhaStatusFilter("todos");
                        }}
                        className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer mt-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Limpar Filtros
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEnrolledTrilhas.map((trilha) => {
                    const trilhaCourses = courses.filter(c => String(c.id_trilha) === String(trilha.id));
                    const statsObj = getTrilhaProgressStats(trilha.id);
                    const progressPercent = statsObj.percent;

                    return (
                      <div
                        key={trilha.id}
                        className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between group"
                      >
                        {/* Trilha Header Banner */}
                        <div
                          style={trilha.gradient_color ? {
                            background: trilha.gradient_color.includes(',')
                              ? `linear-gradient(135deg, ${trilha.gradient_color.split(',')[0].trim()}, ${trilha.gradient_color.split(',')[1].trim()})`
                              : trilha.gradient_color.startsWith("from-")
                              ? undefined
                              : trilha.gradient_color
                          } : undefined}
                          className={`p-5 ${
                            !trilha.gradient_color || trilha.gradient_color.startsWith("from-")
                              ? "bg-gradient-to-r from-[#0b439c] via-blue-700 to-indigo-800 text-white"
                              : "text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs flex items-center gap-1.5">
                              <GraduationCap className="w-3 h-3" />
                              Trilha #{trilha.id}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {statsObj.status === "finalizado" && (
                                <span className="text-[10px] font-black text-emerald-100 bg-emerald-600/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Concluída
                                </span>
                              )}
                              {statsObj.status === "em_andamento" && (
                                <span className="text-[10px] font-black text-amber-100 bg-amber-600/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Em andamento
                                </span>
                              )}
                              {statsObj.status === "nao_iniciado" && (
                                <span className="text-[10px] font-black text-blue-100 bg-blue-600/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" /> Matriculada
                                </span>
                              )}
                              <span className="text-[11px] font-bold text-white/90 bg-black/20 px-2.5 py-0.5 rounded-full">
                                {trilhaCourses.length} {trilhaCourses.length === 1 ? "curso" : "cursos"}
                              </span>
                            </div>
                          </div>

                          <h4 className="font-display font-extrabold text-lg text-white group-hover:underline transition-all">
                            {trilha.nome_da_trilha}
                          </h4>
                          <p className="text-xs text-white/80 line-clamp-2 mt-1 leading-relaxed">
                            {trilha.descricao || "Trilha completa de aprendizado guiado passo a passo."}
                          </p>
                        </div>

                        {/* Trilha Body */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          {/* Courses Preview in this Trilha */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                              Cursos desta Trilha:
                            </span>
                            {trilhaCourses.length === 0 ? (
                              <p className="text-xs text-zinc-400 italic">Nenhum curso associado a esta trilha ainda.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {trilhaCourses.map((c, idx) => (
                                  <div
                                    key={c.id}
                                    className="flex items-center justify-between text-xs bg-zinc-50 hover:bg-blue-50/60 p-2 rounded-lg border border-zinc-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-2 truncate pr-2">
                                      <span className="w-5 h-5 rounded-full bg-blue-100 text-[#0b439c] font-black text-[10px] flex items-center justify-center shrink-0">
                                        {idx + 1}
                                      </span>
                                      <span className="font-semibold text-zinc-800 truncate" title={c.title}>
                                        {c.title}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-400 shrink-0">
                                      {c.category}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Progress indicator */}
                          <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-zinc-600">Seu Progresso na Trilha</span>
                              <span className={statsObj.status === "finalizado" ? "text-emerald-600" : "text-[#0b439c]"}>
                                {progressPercent}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  statsObj.status === "finalizado"
                                    ? "bg-emerald-500"
                                    : "bg-gradient-to-r from-[#0b439c] to-blue-500"
                                }`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Action button: Access Trilha */}
                          <div className="pt-1">
                            <button
                              onClick={() => {
                                setSelectedTrilhaId(String(trilha.id));
                                setActiveTab("courses");
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="w-full py-2.5 px-4 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs group-hover:shadow-md active:scale-[0.99]"
                            >
                              <span>Acessar Trilha de Estudo</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Modal: Catálogo de Trilhas / Adicionar aos Meus Estudos */}
            {isAddTrilhaModalOpen && (
              <div 
                className="fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto overscroll-contain"
                onClick={() => setIsAddTrilhaModalOpen(false)}
              >
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden my-auto animate-fade-in"
                >
                  {/* Modal Header */}
                  <div className="p-5 sm:p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0b439c] flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-extrabold text-lg text-zinc-900 leading-tight">
                          Adicionar Trilha de Estudo
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Conheça a grade de cada trilha e faça sua matrícula para acompanhar o progresso em Meus Estudos.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsAddTrilhaModalOpen(false)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
                      title="Fechar modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Filter bar inside modal */}
                  <div className="p-4 sm:p-5 border-b border-zinc-100 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
                    <div className="relative w-full sm:flex-1">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={catalogSearchTerm}
                        onChange={(e) => setCatalogSearchTerm(e.target.value)}
                        placeholder="Pesquisar por título, tecnologia ou descrição da trilha..."
                        className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white text-zinc-900 text-xs font-medium rounded-xl pl-10 pr-9 py-2.5 outline-none transition-all"
                      />
                      {catalogSearchTerm && (
                        <button
                          onClick={() => setCatalogSearchTerm("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full hover:bg-zinc-200 transition-colors cursor-pointer"
                          title="Limpar pesquisa"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="w-full sm:w-auto">
                      <select
                        value={catalogCategoryFilter}
                        onChange={(e) => setCatalogCategoryFilter(e.target.value)}
                        className="w-full sm:w-56 bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-semibold rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {catalogCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Modal Body: Grid of all platform trilhas */}
                  <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                    {(() => {
                      const availableCatalogTrilhas = trilhas.filter((trilha) => {
                        if (catalogSearchTerm.trim()) {
                          const term = normalizeString(catalogSearchTerm.trim());
                          const matchName = normalizeString(trilha.nome_da_trilha || "").includes(term);
                          const matchDesc = normalizeString(trilha.descricao || "").includes(term);
                          if (!matchName && !matchDesc) return false;
                        }
                        if (catalogCategoryFilter !== "Todas as Categorias") {
                          const trilhaCourses = courses.filter((c) => String(c.id_trilha) === String(trilha.id));
                          const hasCategory = trilhaCourses.some((c) => c.category?.trim() === catalogCategoryFilter.trim());
                          if (!hasCategory) return false;
                        }
                        return true;
                      });

                      if (availableCatalogTrilhas.length === 0) {
                        return (
                          <div className="text-center py-12 space-y-3">
                            <GraduationCap className="w-10 h-10 text-zinc-300 mx-auto" />
                            <h4 className="font-bold text-zinc-800 text-sm">Nenhuma trilha encontrada</h4>
                            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                              Tente ajustar sua busca ou selecionar outra categoria no filtro.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {availableCatalogTrilhas.map((trilha) => {
                            const trilhaCourses = courses.filter((c) => String(c.id_trilha) === String(trilha.id));
                            const isEnrolled = enrolledTrilhaIds.includes(String(trilha.id));

                            return (
                              <div
                                key={trilha.id}
                                className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between"
                              >
                                {/* Card Header */}
                                <div
                                  style={trilha.gradient_color ? {
                                    background: trilha.gradient_color.includes(',')
                                      ? `linear-gradient(135deg, ${trilha.gradient_color.split(',')[0].trim()}, ${trilha.gradient_color.split(',')[1].trim()})`
                                      : trilha.gradient_color.startsWith("from-")
                                      ? undefined
                                      : trilha.gradient_color
                                  } : undefined}
                                  className={`p-4 ${
                                    !trilha.gradient_color || trilha.gradient_color.startsWith("from-")
                                      ? "bg-gradient-to-r from-[#0b439c] to-blue-700 text-white"
                                      : "text-white"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                                      Trilha #{trilha.id}
                                    </span>
                                    {isEnrolled ? (
                                      <span className="text-[10px] font-black text-emerald-100 bg-emerald-600/90 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Matriculado
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-white/90 bg-black/25 px-2 py-0.5 rounded-full">
                                        {trilhaCourses.length} {trilhaCourses.length === 1 ? "curso" : "cursos"}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-display font-bold text-base text-white leading-tight">
                                    {trilha.nome_da_trilha}
                                  </h4>
                                  <p className="text-xs text-white/80 line-clamp-2 mt-1 leading-relaxed">
                                    {trilha.descricao || "Trilha completa de aprendizado guiado passo a passo."}
                                  </p>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                  <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                      Grade Curricular:
                                    </span>
                                    {trilhaCourses.length === 0 ? (
                                      <p className="text-xs text-zinc-400 italic">Nenhum curso associado ainda.</p>
                                    ) : (
                                      <div className="space-y-1">
                                        {trilhaCourses.slice(0, 3).map((c, idx) => (
                                          <div
                                            key={c.id}
                                            className="flex items-center justify-between text-xs bg-zinc-50 p-1.5 rounded-lg border border-zinc-100"
                                          >
                                            <span className="font-medium text-zinc-800 truncate pr-2" title={c.title}>
                                              {idx + 1}. {c.title}
                                            </span>
                                            <span className="text-[10px] text-zinc-400 shrink-0">{c.category}</span>
                                          </div>
                                        ))}
                                        {trilhaCourses.length > 3 && (
                                          <p className="text-[10px] text-zinc-400 font-medium pl-1">
                                            + {trilhaCourses.length - 3} outros cursos nesta trilha
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Buttons: Ver Trilha & Fazer Matrícula */}
                                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedTrilhaId(String(trilha.id));
                                        setActiveTab("courses");
                                        setIsAddTrilhaModalOpen(false);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                      }}
                                      className="flex-1 py-2 px-3 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-zinc-600" />
                                      <span>Visualizar Trilha</span>
                                    </button>

                                    {isEnrolled ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedTrilhaId(String(trilha.id));
                                          setActiveTab("courses");
                                          setIsAddTrilhaModalOpen(false);
                                          window.scrollTo({ top: 0, behavior: "smooth" });
                                        }}
                                        className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Matriculado · Acessar</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setEnrollModalTrilha({
                                          id: trilha.id,
                                          name: trilha.nome_da_trilha,
                                          description: trilha.descricao,
                                          totalCourses: trilhaCourses.length
                                        })}
                                        className="flex-1 py-2 px-3 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Fazer Matrícula</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500 shrink-0">
                    <span>{trilhas.length} {trilhas.length === 1 ? "trilha cadastrada" : "trilhas cadastradas"} na plataforma</span>
                    <button
                      type="button"
                      onClick={() => setIsAddTrilhaModalOpen(false)}
                      className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: COURSES GRADE (TRILHA DETAIL) ==================== */}
        {activeTab === "courses" && (() => {
          const currentTrilha = trilhas.find(t => String(t.id) === String(selectedTrilhaId)) || trilhas[0];
          const isEnrolled = currentTrilha ? enrolledTrilhaIds.includes(String(currentTrilha.id)) : true;
          const trilhaCourses = currentTrilha ? courses.filter(c => String(c.id_trilha) === String(currentTrilha.id)) : courses;
          const totalLessonsInTrilha = trilhaCourses.reduce((acc, c) => acc + (c.modules?.reduce((mAcc, m) => mAcc + (m.lessons?.length || 0), 0) || 0), 0);
          const trilhaStats = currentTrilha ? getTrilhaProgressStats(currentTrilha.id) : null;
          
          const filteredCourses = trilhaCourses.filter((course) => {
            if (!courseSearchTerm.trim()) return true;
            const term = normalizeString(courseSearchTerm.trim());
            const matchTitle = normalizeString(course.title).includes(term);
            const matchDesc = normalizeString(course.description || "").includes(term);
            const matchCat = normalizeString(course.category || "").includes(term);
            return matchTitle || matchDesc || matchCat;
          });

          return (
            <div className="space-y-6 animate-fade-in">
              {/* Feedback notification banner after enrollment */}
              {enrollSuccessMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{enrollSuccessMessage}</span>
                  </div>
                  <button
                    onClick={() => setEnrollSuccessMessage(null)}
                    className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                    title="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Trilha Navigation Bar & Quick Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => {
                      setSelectedTrilhaId("");
                      setActiveTab("trilhas");
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition-colors cursor-pointer border border-zinc-200 shadow-xs shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4 text-zinc-700" />
                    <span>Voltar para Meus Estudos</span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-extrabold text-base sm:text-lg text-zinc-900 leading-tight truncate" title={currentTrilha?.nome_da_trilha}>
                      {currentTrilha?.nome_da_trilha || "Trilha de Estudo"}
                    </h3>
                    <p className="text-xs text-zinc-500 font-medium">
                      {trilhaCourses.length} {trilhaCourses.length === 1 ? 'curso disponível' : 'cursos disponíveis'} nesta trilha
                    </p>
                  </div>
                </div>

                {/* Search Input within this trilha */}
                <div className="relative w-full md:w-72 shrink-0">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={courseSearchTerm}
                    onChange={(e) => setCourseSearchTerm(e.target.value)}
                    placeholder="Pesquisar curso nesta trilha..."
                    className="w-full bg-zinc-50 border border-zinc-200 focus:border-blue-500 focus:bg-white text-zinc-900 text-xs font-medium rounded-xl pl-10 pr-9 py-2.5 outline-none transition-all shadow-2xs"
                  />
                  {courseSearchTerm && (
                    <button
                      onClick={() => setCourseSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full hover:bg-zinc-200 transition-colors cursor-pointer"
                      title="Limpar pesquisa"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Full Information Hero Banner of the Trilha */}
              {currentTrilha && (
                <div
                  style={currentTrilha.gradient_color ? {
                    background: currentTrilha.gradient_color.includes(',')
                      ? `linear-gradient(135deg, ${currentTrilha.gradient_color.split(',')[0].trim()}, ${currentTrilha.gradient_color.split(',')[1].trim()})`
                      : currentTrilha.gradient_color.startsWith("from-")
                      ? undefined
                      : currentTrilha.gradient_color
                  } : undefined}
                  className={`p-6 sm:p-8 rounded-2xl shadow-sm text-white space-y-5 ${
                    !currentTrilha.gradient_color || currentTrilha.gradient_color.startsWith("from-")
                      ? "bg-gradient-to-r from-[#0b439c] via-blue-800 to-indigo-900"
                      : ""
                  }`}
                >
                  {/* Badges line */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs border border-white/20 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5" />
                        Trilha de Estudo #{currentTrilha.id}
                      </span>
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs border border-white/20 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        {trilhaCourses.length} {trilhaCourses.length === 1 ? 'curso' : 'cursos'}
                      </span>
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs border border-white/20 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {totalLessonsInTrilha} aulas na grade
                      </span>
                    </div>

                    {/* Status Pill */}
                    {isEnrolled ? (
                      <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-emerald-500 text-white shadow-xs flex items-center gap-1.5 border border-white/20">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        Matriculado(a) em Meus Estudos
                      </span>
                    ) : (
                      <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-amber-500 text-white shadow-xs flex items-center gap-1.5 border border-white/20">
                        <Lock className="w-3.5 h-3.5 text-white" />
                        Modo Visualização · Não Matriculado(a)
                      </span>
                    )}
                  </div>

                  {/* Trilha Title & Full Description */}
                  <div className="space-y-2 max-w-4xl">
                    <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                      {currentTrilha.nome_da_trilha}
                    </h2>
                    <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal">
                      {currentTrilha.descricao || "Domine esta tecnologia com formação completa, trilha prática e exercícios orientados ao mercado."}
                    </p>
                  </div>

                  {/* Bottom Action / Progress Row */}
                  <div className="pt-4 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {isEnrolled ? (
                      <>
                        <div className="flex-1 max-w-md space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-white/95">
                            <span>Progresso Geral da Trilha</span>
                            <span>{trilhaStats?.percent || 0}% Concluído</span>
                          </div>
                          <div className="w-full h-2.5 bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/20">
                            <div
                              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${trilhaStats?.percent || 0}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-white/80">
                            {trilhaStats?.completedInTrilha || 0} de {totalLessonsInTrilha} aulas concluídas
                          </p>
                        </div>

                        {/* Unenroll Button inside Trilha View */}
                        <div>
                          <button
                            type="button"
                            onClick={() => setUnenrollModalTrilha({ id: currentTrilha.id, name: currentTrilha.nome_da_trilha })}
                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-red-600 text-white border border-white/20 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                            title="Desfazer matrícula nesta trilha"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Desistir da Trilha</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-white flex items-center gap-2">
                            <Lock className="w-4 h-4 text-amber-300" />
                            Acesso às Aulas Bloqueado
                          </h4>
                          <p className="text-xs text-white/85">
                            Se matricule nessa trilha de estudo para você iniciar nas aulas e acompanhar seu progresso.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEnrollModalTrilha({
                            id: currentTrilha.id,
                            name: currentTrilha.nome_da_trilha,
                            description: currentTrilha.descricao,
                            totalCourses: trilhaCourses.length
                          })}
                          className="px-5 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#0b439c] font-black text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Fazer Matrícula</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Courses list */}
              {filteredCourses.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-zinc-800 text-base">Nenhum curso encontrado</h4>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    {courseSearchTerm.trim()
                      ? `Não encontramos nenhum curso com o nome "${courseSearchTerm}" nesta trilha.`
                      : "Esta trilha de estudo ainda não possui cursos cadastrados."}
                  </p>
                  {courseSearchTerm.trim() && (
                    <button
                      onClick={() => setCourseSearchTerm("")}
                      className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer mt-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Limpar Pesquisa
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => {
                    const progress = getCourseProgress(course);
                    const courseLessonsCount = course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0;

                    // Se NÃO estiver matriculado: exibir apenas gradiente, nome, tanto de aulas e mais nada
                    if (!isEnrolled) {
                      return (
                        <div
                          key={course.id}
                          onClick={() => {
                            if (currentTrilha) {
                              setEnrollModalTrilha({
                                id: currentTrilha.id,
                                name: currentTrilha.nome_da_trilha,
                                description: currentTrilha.descricao,
                                totalCourses: trilhaCourses.length
                              });
                            }
                          }}
                          className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between cursor-pointer group"
                        >
                          {/* Course Header with Gradient */}
                          <div
                            style={course.gradientColor ? {
                              background: course.gradientColor.includes(',')
                                ? `linear-gradient(135deg, ${course.gradientColor.split(',')[0].trim()}, ${course.gradientColor.split(',')[1].trim()})`
                                : course.gradientColor
                            } : undefined}
                            className={`p-5 ${
                              course.gradientColor ? 'text-white shadow-xs' :
                              course.category === 'Back-end' ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white' :
                              course.category === 'Front-end' ? 'bg-gradient-to-r from-[#0b439c] to-blue-700 text-white' :
                              course.category === 'Data Science' ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white' :
                              course.category === 'Scripts & DevOps' ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white' :
                              course.category === 'Automação' ? 'bg-gradient-to-r from-indigo-600 to-blue-800 text-white' :
                              'bg-gradient-to-r from-[#0b439c] to-indigo-800 text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-white backdrop-blur-xs">
                                {course.category}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/25 text-white/90 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Bloqueado
                              </span>
                            </div>
                            <h4 className="font-display font-black text-lg leading-tight tracking-tight text-white">
                              {course.title}
                            </h4>
                          </div>

                          {/* Minimal unenrolled card body: only lesson count and lock indicator */}
                          <div className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-zinc-50/50">
                            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
                              <span className="flex items-center gap-1.5 font-bold text-zinc-700">
                                <BookOpen className="w-4 h-4 text-zinc-400" />
                                {courseLessonsCount} {courseLessonsCount === 1 ? 'Aula' : 'Aulas'}
                              </span>
                              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <Lock className="w-3 h-3 text-amber-600" />
                                Matrícula necessária
                              </span>
                            </div>

                            <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-xs text-zinc-400 group-hover:text-[#0b439c] transition-colors">
                              <span className="text-[11px] font-medium">Clique para se matricular e liberar</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Se ESTIVER matriculado: card completo com progresso e botão de iniciar/acessar
                    return (
                      <div 
                        key={course.id}
                        className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between"
                      >
                        {/* Header color styling based on gradientColor or category */}
                        <div 
                          style={course.gradientColor ? {
                            background: course.gradientColor.includes(',') 
                              ? `linear-gradient(135deg, ${course.gradientColor.split(',')[0].trim()}, ${course.gradientColor.split(',')[1].trim()})`
                              : course.gradientColor
                          } : undefined}
                          className={`p-4 ${
                            course.gradientColor ? 'text-white shadow-xs' :
                            course.category === 'Back-end' ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white' :
                            course.category === 'Front-end' ? 'bg-gradient-to-r from-[#0b439c] to-blue-700 text-white' :
                            course.category === 'Data Science' ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white' :
                            course.category === 'Scripts & DevOps' ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white' :
                            course.category === 'Automação' ? 'bg-gradient-to-r from-indigo-600 to-blue-800 text-white' :
                            'bg-gradient-to-r from-[#0b439c] to-indigo-800 text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 text-white backdrop-blur-xs">
                                {course.category}
                              </span>
                            </div>
                            
                            {accountType === "administrador" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveCourse(course.id);
                                }}
                                className="p-1 rounded bg-white/10 hover:bg-red-600 hover:text-white text-white/90 transition-all cursor-pointer flex items-center justify-center border border-white/10"
                                title="Excluir Curso"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <h4 className="font-display font-black text-lg leading-tight tracking-tight">
                            {course.title}
                          </h4>
                        </div>

                        {/* Description content */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">
                            {course.description}
                          </p>

                          <div className="space-y-3 pt-2">
                            {/* Meta Duration / modules count */}
                            <div className="flex items-center text-[11px] text-zinc-400 font-medium">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5" />
                                {courseLessonsCount} Aulas
                              </span>
                            </div>

                            {/* Progress bar if started */}
                            {progress > 0 && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold">
                                  <span className="text-zinc-500">Progresso</span>
                                  <span className="text-blue-700">{progress}%</span>
                                </div>
                                <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom action trigger */}
                        <div className="px-5 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between">
                          {progress === 100 ? (
                            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Curso Concluído
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500 font-medium">
                              {progress > 0 ? "Em andamento" : "Não iniciado"}
                            </span>
                          )}

                          <button
                            onClick={() => handleOpenCourseInfo(course, "courses")}
                            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>{progress > 0 ? "Continuar Curso" : "Iniciar Curso"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ==================== TAB: MEUS PROJETOS ==================== */}
        {activeTab === "projects" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <ProjectsView
              selectedTrilhaId={selectedTrilhaId}
              setSelectedTrilhaId={setSelectedTrilhaId}
              trilhas={trilhas}
            />
          </motion.div>
        )}

        {/* ==================== TAB: USUÁRIOS (ADMIN) ==================== */}
        {activeTab === "usuarios" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {isCreatingUserPage ? (
              /* Tela Completa de Criação de Usuário (Mesmo padrão de página da edição, apenas com Dados do Usuário e Criar Usuário) */
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingUserPage(false);
                      setCreateUserErrorMsg(null);
                      setCreateUserSuccessMsg(null);
                      scrollToTop();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-xs transition-all shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-zinc-500" />
                    <span>Voltar para Controle de Usuários</span>
                  </button>
                </div>

                <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm p-6 sm:p-10 space-y-6">
                  {/* Cabeçalho Criar Usuário */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 text-[#0b439c] flex items-center justify-center shrink-0 shadow-2xs">
                        <UserPlus className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                          Criar Usuário
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-0.5">
                          Preencha os dados abaixo para criar e adicionar uma nova conta diretamente no banco de dados.
                        </p>
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-700">
                        Acesso Inicial: Liberado
                      </span>
                    </div>
                  </div>

                  {/* Formulário Dados do Usuário */}
                  <form onSubmit={handleCreateUser} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Dados do Usuário
                      </h3>
                    </div>

                    {createUserErrorMsg && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2.5 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{createUserErrorMsg}</span>
                      </div>
                    )}

                    {createUserSuccessMsg && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2.5 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{createUserSuccessMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Nome Completo */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          required
                          value={newUserName}
                          onChange={(e) => {
                            setNewUserName(e.target.value);
                            if (createUserErrorMsg) setCreateUserErrorMsg(null);
                          }}
                          placeholder="Ex: João da Silva"
                          className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                        />
                        <p className="text-[11px] text-zinc-400">
                          Nome exibido no perfil e nas interações da plataforma.
                        </p>
                      </div>

                      {/* Endereço de E-mail */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Endereço de E-mail *
                        </label>
                        <input
                          type="email"
                          required
                          value={newUserEmail}
                          onChange={(e) => {
                            setNewUserEmail(e.target.value);
                            if (createUserErrorMsg) setCreateUserErrorMsg(null);
                          }}
                          placeholder="Ex: joao.silva@exemplo.com"
                          className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                        />
                        <p className="text-[11px] text-zinc-400">
                          E-mail que o usuário utilizará para entrar no sistema.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Senha do Novo Usuário */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Senha do Usuário *
                        </label>
                        <div className="relative">
                          <input
                            type={showNewUserPassword ? "text" : "password"}
                            required
                            value={newUserPassword}
                            onChange={(e) => {
                              setNewUserPassword(e.target.value);
                              if (createUserErrorMsg) setCreateUserErrorMsg(null);
                            }}
                            placeholder="Digite a senha do usuário"
                            className="w-full bg-white border-2 border-[#0b439c] rounded-xl pl-4 pr-11 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-all p-1 cursor-pointer"
                            title={showNewUserPassword ? "Ocultar senha" : "Ver senha"}
                          >
                            {showNewUserPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Senha de acesso para a nova conta.
                        </p>
                      </div>

                      {/* Sua Senha (Confirmação do Administrador) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Sua Senha *
                        </label>
                        <div className="relative">
                          <input
                            type={showCreateUserAdminPassword ? "text" : "password"}
                            required
                            value={createUserAdminPassword}
                            onChange={(e) => {
                              setCreateUserAdminPassword(e.target.value);
                              if (createUserErrorMsg) setCreateUserErrorMsg(null);
                            }}
                            placeholder="Confirme com a sua senha"
                            className="w-full bg-white border-2 border-[#0b439c] rounded-xl pl-4 pr-11 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCreateUserAdminPassword(!showCreateUserAdminPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-all p-1 cursor-pointer"
                            title={showCreateUserAdminPassword ? "Ocultar sua senha" : "Ver sua senha"}
                          >
                            {showCreateUserAdminPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Digite a sua senha de administrador para autorizar.
                        </p>
                      </div>

                      {/* Cargo / Papel Institucional */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Cargo / Papel Institucional *
                        </label>
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value as any)}
                          className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all cursor-pointer shadow-xs"
                        >
                          <option value="estudante">Estudante</option>
                          <option value="instrutor">Instrutor</option>
                          <option value="administrador">Administrador</option>
                        </select>
                        <p className="text-[11px] text-zinc-400">
                          Define o nível de permissão do usuário na plataforma.
                        </p>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingUserPage(false);
                          setCreateUserErrorMsg(null);
                          setCreateUserSuccessMsg(null);
                          scrollToTop();
                        }}
                        className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={isCreatingUserSubmitting}
                        className="px-6 py-2.5 bg-[#0b439c] hover:bg-blue-800 disabled:opacity-50 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center gap-2 cursor-pointer"
                      >
                        {isCreatingUserSubmitting ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                        <span>Criar Usuário</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : !editingUser ? (
              <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-black text-2xl text-zinc-900 tracking-tight flex items-center gap-2">
                  <Users className="w-7 h-7 text-[#0b439c]" />
                  Controle de Usuários e Cargos
                </h3>
                <p className="text-sm text-zinc-500">
                  Gerencie permissões institucionais e visualize os usuários registrados no sistema.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="bg-white border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 shadow-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <span>{allUsers.length} Perfis Registrados</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingUserPage(true);
                    setEditingUser(null);
                    setNewUserName("");
                    setNewUserEmail("");
                    setNewUserPassword("");
                    setShowNewUserPassword(false);
                    setCreateUserAdminPassword("");
                    setShowCreateUserAdminPassword(false);
                    setNewUserRole("estudante");
                    setCreateUserErrorMsg(null);
                    setCreateUserSuccessMsg(null);
                    scrollToTop();
                  }}
                  className="px-4 py-2.5 bg-[#0b439c] hover:bg-blue-800 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Criar / Adicionar Usuário</span>
                </button>
              </div>
            </div>

            {/* Search Bar for Users */}
            <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome, e-mail ou Matrícula do usuário (6 números)..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-9 py-2.5 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs"
                />
                {userSearchTerm && (
                  <button
                    onClick={() => setUserSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full hover:bg-zinc-200 transition-colors cursor-pointer"
                    title="Limpar pesquisa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <span className="text-xs text-zinc-500 font-medium shrink-0">
                Exibindo {
                  allUsers.filter((u) => matchesUserSearch(u, userSearchTerm, allUsers)).length
                } de {allUsers.length} usuários
              </span>
            </div>

            {/* Users table */}
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="font-bold text-zinc-800 text-sm">Tabela Geral de Usuários e Cargos</span>
                <span className="text-xs text-zinc-400 font-medium">Clique no ícone de lápis para ver o perfil completo e editar</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-black uppercase text-zinc-500 tracking-wider">
                      <th className="py-3.5 px-5">Usuário / E-mail / Matrícula</th>
                      <th className="py-3.5 px-5">Cargo / Papel</th>
                      <th className="py-3.5 px-5">Data de Cadastro</th>
                      <th className="py-3.5 px-5">Acesso</th>
                      <th className="py-3.5 px-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 text-xs text-zinc-700 font-medium">
                    {allUsers
                      .filter((item) => matchesUserSearch(item, userSearchTerm, allUsers))
                      .map((item) => {
                        const userMatricula = extractMatricula(item.matricula || item.id, allUsers);
                        return (
                        <tr 
                          key={item.id} 
                          className="hover:bg-blue-50/40 transition-colors group"
                        >
                          {/* Coluna 1: Usuário */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-black text-xs text-[#0b439c] shrink-0 shadow-2xs select-none">
                                {(item.name || "U").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-zinc-900 flex items-center gap-2">
                                  <span>{item.name}</span>
                                  {(item.id === user?.id || (user?.email && item.email && item.email.toLowerCase() === user.email.toLowerCase())) && (
                                    <span className="text-[9px] bg-blue-100 text-[#0b439c] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                                      Você
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-500 truncate">{item.email}</div>
                                <div className="text-[10px] font-mono text-zinc-500 mt-0.5" title={`Matrícula: ${userMatricula}`}>
                                  Matrícula: <span className="font-black text-[#0b439c]">{userMatricula}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Coluna 2: Cargo / Papel */}
                          <td className="py-4 px-5">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border inline-block ${
                              item.account_type === "administrador"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : item.account_type === "instrutor"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                              {item.account_type === "administrador" ? "Administrador" : item.account_type === "instrutor" ? "Instrutor" : "Estudante"}
                            </span>
                          </td>

                          {/* Coluna 3: Data de Cadastro */}
                          <td className="py-4 px-5 text-zinc-500 font-mono text-[11px]">
                            {item.created_at ? String(item.created_at).split("T")[0] : "2026-07-23"}
                          </td>

                          {/* Coluna 4: Acesso */}
                          <td className="py-4 px-5">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              item.acesso === "Bloqueado" || item.status === "Bloqueado"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                item.acesso === "Bloqueado" || item.status === "Bloqueado"
                                  ? "bg-red-500 animate-pulse"
                                  : "bg-emerald-500 animate-pulse"
                              }`} />
                              {(item.acesso === "Bloqueado" || item.status === "Bloqueado") ? "Bloqueado" : "Liberado"}
                            </span>
                          </td>

                          {/* Coluna 5: Ações */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenEditUser(item, false)}
                                className="p-1.5 text-zinc-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                title="Editar Usuário"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setUserToDelete(item);
                                  setDeleteAdminPassword("");
                                  setDeleteErrorMsg("");
                                }}
                                className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                title="Remover Usuário"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {allUsers.filter((item) => matchesUserSearch(item, userSearchTerm, allUsers)).length === 0 && (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  Nenhum usuário encontrado para "<strong>{userSearchTerm}</strong>".
                </div>
              )}
            </div>
              </>
            ) : (
              /* Visualização e Edição Completa do Usuário (Mesmo layout da aba de Perfil, direto na página) */
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const cameFromAtend = editingUserFromAtendimento;
                      setEditingUser(null);
                      setEditingUserFromAtendimento(false);
                      if (cameFromAtend) {
                        setActiveTab("atendimento");
                      }
                      scrollToTop();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-xs transition-all shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-zinc-500" />
                    <span>{editingUserFromAtendimento ? "Voltar para Atendimento" : "Voltar para Controle de Usuários"}</span>
                  </button>
                </div>

                <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm p-6 sm:p-10 space-y-8">
                  {/* Cartão de Perfil do Usuário (Igual à aba de Perfil) */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 pb-8 border-b border-zinc-100">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-tr from-[#0b439c] via-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-3xl sm:text-4xl shadow-lg shadow-blue-900/15 shrink-0 border-4 border-white ring-2 ring-blue-100">
                      {(editUserName || editingUser.name || "U").split(" ").filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>

                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-[#0b439c] text-xs font-bold uppercase tracking-wider">
                          <User className="w-3.5 h-3.5" />
                          <span>
                            Conta de {editUserRole === "administrador" ? "Administrador" : editUserRole === "instrutor" ? "Instrutor" : "Estudante"}
                          </span>
                        </div>

                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                          editUserStatus === "Bloqueado"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            editUserStatus === "Bloqueado" ? "bg-red-500 animate-pulse" : "bg-emerald-500 animate-pulse"
                          }`} />
                          {editUserStatus === "Bloqueado" ? "Bloqueado" : "Liberado"}
                        </span>
                      </div>

                      <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight truncate">
                          {editUserName || editingUser.name}
                        </h1>
                        <p className="text-sm sm:text-base font-semibold text-zinc-500 mt-0.5 truncate flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span>{editUserEmail || editingUser.email}</span>
                        </p>
                        {(editingUser.matricula || editingUser.id) && (() => {
                          const userMat = extractMatricula(editingUser.matricula || editingUser.id, allUsers);
                          return (
                            <p className="text-xs font-mono text-zinc-600 mt-1 bg-zinc-50 border border-zinc-200/80 px-2.5 py-1 rounded-lg inline-block">
                              Matrícula: <span className="font-black text-[#0b439c]">{userMat}</span>
                            </p>
                          );
                        })()}
                      </div>

                      <p className="text-xs text-zinc-400">
                        Membro da plataforma de aprendizagem Programa Certo
                      </p>
                    </div>
                  </div>

                  {/* Painel de Progresso e Conquistas (Igual à aba de Perfil) */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Painel de Progresso e Conquistas
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Total de Aulas Concluídas */}
                      <div className="bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-200/70 rounded-2xl p-5 sm:p-6 transition-all shadow-2xs">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Total de Aulas Concluídas
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-[#0b439c] flex items-center justify-center">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-3xl sm:text-4xl font-black text-[#0b439c]">
                          {editingUserStats.loading ? "..." : editingUserStats.completedLessons}
                        </div>
                        <p className="text-xs text-zinc-500 font-medium mt-1">
                          Lições finalizadas com sucesso
                        </p>
                      </div>

                      {/* Total de Cursos Concluídos */}
                      <div className="bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-200/70 rounded-2xl p-5 sm:p-6 transition-all shadow-2xs">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Total de Cursos Concluídos
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-3xl sm:text-4xl font-black text-emerald-700">
                          {editingUserStats.loading ? "..." : editingUserStats.completedCourses}
                        </div>
                        <p className="text-xs text-zinc-500 font-medium mt-1">
                          Cursos com todas as aulas concluídas
                        </p>
                      </div>

                      {/* Total de Trilhas Concluídas */}
                      <div className="bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-200/70 rounded-2xl p-5 sm:p-6 transition-all shadow-2xs">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Total de Trilhas Concluídas
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-3xl sm:text-4xl font-black text-amber-700">
                          {editingUserStats.loading ? "..." : editingUserStats.completedTrilhas}
                        </div>
                        <p className="text-xs text-zinc-500 font-medium mt-1">
                          Trilhas de estudo completadas
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Formulário de Edição Completa */}
                  <form id="edit-user-form" onSubmit={handleSaveEditUser} className="pt-6 border-t border-zinc-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Dados do Usuário e Permissões
                      </h3>
                      {isEditingUserFields && (
                        <span className="text-[11px] font-bold text-[#0b439c] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                          Modo de Edição Ativo
                        </span>
                      )}
                    </div>

                    {editUserSuccessMsg && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{editUserSuccessMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {/* Nome Completo */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Nome Completo
                        </label>
                        {isEditingUserFields ? (
                          <input
                            type="text"
                            required
                            value={editUserName}
                            onChange={(e) => setEditUserName(e.target.value)}
                            placeholder="Ex: João da Silva"
                            className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                          />
                        ) : (
                          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 select-none cursor-default">
                            {editUserName || "Não informado"}
                          </div>
                        )}
                        <p className="text-[11px] text-zinc-400">
                          Nome exibido no perfil e nas interações da plataforma.
                        </p>
                      </div>

                      {/* Endereço de E-mail */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Endereço de E-mail
                        </label>
                        {isEditingUserFields ? (
                          <input
                            type="email"
                            required
                            value={editUserEmail}
                            onChange={(e) => setEditUserEmail(e.target.value)}
                            placeholder="Ex: joao.silva@exemplo.com"
                            className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                          />
                        ) : (
                          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-800 select-none cursor-default truncate">
                            {editUserEmail || "Não informado"}
                          </div>
                        )}
                        <p className="text-[11px] text-zinc-400">
                          Identificador de acesso associado à conta do usuário.
                        </p>
                      </div>

                      {/* Nova Senha */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Nova Senha (Opcional)
                        </label>
                        {isEditingUserFields ? (
                          <div className="relative">
                            <input
                              type={showEditUserPassword ? "text" : "password"}
                              value={editUserPassword}
                              onChange={(e) => setEditUserPassword(e.target.value)}
                              placeholder="Deixe em branco para manter a atual"
                              className="w-full bg-white border-2 border-[#0b439c] rounded-xl pl-4 pr-11 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-all p-1 cursor-pointer"
                              title={showEditUserPassword ? "Ocultar senha" : "Ver senha"}
                            >
                              {showEditUserPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-400 select-none cursor-default tracking-widest font-mono">
                            ••••••••••••
                          </div>
                        )}
                        <p className="text-[11px] text-zinc-400">
                          {isEditingUserFields
                            ? "Deixe em branco para manter a senha atual."
                            : "Senha de acesso protegida por criptografia."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Cargo / Papel Institucional */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Cargo / Papel Institucional
                        </label>
                        {isEditingUserFields ? (
                          <select
                            value={editUserRole}
                            onChange={(e) => setEditUserRole(e.target.value as any)}
                            className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all cursor-pointer shadow-xs"
                          >
                            <option value="estudante">Estudante</option>
                            <option value="instrutor">Instrutor</option>
                            <option value="administrador">Administrador</option>
                          </select>
                        ) : (
                          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 select-none cursor-default">
                            {editUserRole === "administrador" ? "Administrador" : editUserRole === "instrutor" ? "Instrutor" : "Estudante"}
                          </div>
                        )}
                      </div>

                      {/* Acesso */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Acesso
                        </label>
                        {isEditingUserFields ? (
                          <select
                            value={editUserStatus}
                            onChange={(e) => setEditUserStatus(e.target.value as any)}
                            className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all cursor-pointer shadow-xs"
                          >
                            <option value="Liberado">Liberado</option>
                            <option value="Bloqueado">Bloqueado</option>
                          </select>
                        ) : (
                          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 select-none cursor-default">
                            {editUserStatus}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Motivo */}
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold uppercase tracking-wider block ${editUserStatus === "Bloqueado" ? "text-red-700" : "text-zinc-600"}`}>
                        Motivo {editUserStatus === "Bloqueado" ? "(Obrigatório para Bloqueado) *" : "(Caso o acesso seja marcado como Bloqueado)"}
                      </label>
                      {isEditingUserFields ? (
                        <textarea
                          required={editUserStatus === "Bloqueado"}
                          value={editUserMotivo}
                          onChange={(e) => setEditUserMotivo(e.target.value)}
                          placeholder="Informe a justificativa caso o acesso seja marcado como Bloqueado (essa é a mensagem que o aluno verá se tentar entrar no sistema)..."
                          rows={3}
                          className="w-full bg-white border-2 border-[#0b439c] rounded-xl p-4 text-sm font-medium text-zinc-900 focus:outline-none transition-all resize-none shadow-xs"
                        />
                      ) : (
                        <div className="w-full min-h-[84px] bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-medium text-zinc-700 select-none cursor-default whitespace-pre-wrap">
                          {editUserMotivo ? (
                            editUserMotivo
                          ) : (
                            <span className="text-zinc-400">Nenhum motivo de bloqueio registrado.</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botão Editar Dados (Logo abaixo do Motivo) */}
                    <div className="pt-1">
                      {!isEditingUserFields ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingUserFields(true);
                            setEditUserSuccessMsg(null);
                          }}
                          className="px-5 py-2.5 bg-[#0b439c] hover:bg-blue-800 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center gap-2 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Editar Dados</span>
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditUserName(editingUser.name || editingUser.nome || "");
                              setEditUserEmail(editingUser.email || "");
                              setEditUserPassword("");
                              setShowEditUserPassword(false);
                              setEditUserRole(editingUser.account_type || "estudante");
                              const isBlocked = editingUser.acesso === "Bloqueado" || editingUser.status === "Bloqueado" || editingUser.status_da_conta === "Bloqueado";
                              setEditUserStatus(isBlocked ? "Bloqueado" : "Liberado");
                              setEditUserMotivo(editingUser.motivo || "");
                              setIsEditingUserFields(false);
                            }}
                            className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>

                          <button
                            type="submit"
                            className="px-6 py-2.5 bg-[#0b439c] hover:bg-blue-800 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center gap-2 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Salvar Alterações</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Informações da Conta: Data de Criação da Conta */}
                    <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-50/80 rounded-2xl p-4 sm:p-5 border border-zinc-200/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0b439c] flex items-center justify-center shrink-0 shadow-2xs">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                            Data de Criação da Conta
                          </span>
                          <span className="text-sm font-extrabold text-zinc-900 font-mono">
                            {editingUser.created_at ? String(editingUser.created_at).split("T")[0] : "2026-07-23"}
                          </span>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full border ${
                        editUserStatus === "Bloqueado"
                          ? "bg-red-50 border-red-200/60"
                          : "bg-emerald-50 border-emerald-200/60"
                      }`}>
                        <span className={`w-2 h-2 rounded-full inline-block animate-pulse ${
                          editUserStatus === "Bloqueado" ? "bg-red-500" : "bg-emerald-500"
                        }`} />
                        <span className={`text-xs font-bold ${
                          editUserStatus === "Bloqueado" ? "text-red-700" : "text-emerald-700"
                        }`}>
                          {editUserStatus === "Bloqueado" ? "Acesso Bloqueado" : "Conta Liberada"}
                        </span>
                      </div>
                    </div>

                    {/* Exclusão Permanente da Conta */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 bg-zinc-50/80 rounded-2xl p-5 sm:p-6 border border-zinc-200/70">
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2 text-zinc-900 font-extrabold text-sm tracking-tight">
                          <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </div>
                          <span>Excluir Conta Permanentemente</span>
                        </div>
                        <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                          Ao solicitar a exclusão desta conta, todos os dados cadastrais, cursos concluídos e lições finalizadas deste usuário serão apagados. Esta ação não pode ser desfeita.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUserToDelete(editingUser);
                          setDeleteAdminPassword("");
                          setDeleteErrorMsg("");
                        }}
                        className="px-5 py-2.5 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-red-200 text-red-600 font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir Conta Permanentemente</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ==================== TAB: GESTÃO DE CURSOS (ADMIN/INSTRUTOR) ==================== */}
        {activeTab === "cursos_gestao" && (accountType === "administrador" || accountType === "instrutor") && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-black text-2xl text-zinc-900 tracking-tight flex items-center gap-2">
                  <BookOpen className="w-7 h-7 text-[#0b439c]" />
                  Gestão e Cadastro de Cursos
                </h3>
                <p className="text-sm text-zinc-500">
                  Pesquise, crie novos cursos e gerencie o catálogo da plataforma.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white border border-zinc-200 px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 shadow-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{courses.length} Cursos Cadastrados</span>
                </div>
                <button
                  onClick={() => setIsCreateCourseModalOpen(true)}
                  className="px-4 py-2 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Novo Curso</span>
                </button>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={adminCourseSearch}
                  onChange={(e) => setAdminCourseSearch(e.target.value)}
                  placeholder="Pesquisar curso por título, descrição, categoria ou instrutor..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-9 py-2.5 text-xs text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs"
                />
                {adminCourseSearch && (
                  <button
                    onClick={() => setAdminCourseSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full hover:bg-zinc-200 transition-colors cursor-pointer"
                    title="Limpar pesquisa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 shrink-0">
                <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                  <button
                    onClick={() => setAdminCourseViewMode("table")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      adminCourseViewMode === "table"
                        ? "bg-white text-[#0b439c] shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                    title="Visão em Tabela"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tabela</span>
                  </button>
                  <button
                    onClick={() => setAdminCourseViewMode("cards")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      adminCourseViewMode === "cards"
                        ? "bg-white text-[#0b439c] shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                    title="Visão em Cards"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                </div>

                <span className="text-xs text-zinc-400 font-medium shrink-0">
                  Exibindo {courses.filter(c =>
                    c.title.toLowerCase().includes(adminCourseSearch.toLowerCase()) ||
                    c.category.toLowerCase().includes(adminCourseSearch.toLowerCase()) ||
                    c.description.toLowerCase().includes(adminCourseSearch.toLowerCase()) ||
                    (c.instructor && c.instructor.toLowerCase().includes(adminCourseSearch.toLowerCase()))
                  ).length} de {courses.length} cursos
                </span>
              </div>
            </div>

            {/* Courses Table / Cards List */}
            {courses.filter(c =>
              c.title.toLowerCase().includes(adminCourseSearch.toLowerCase()) ||
              c.category.toLowerCase().includes(adminCourseSearch.toLowerCase()) ||
              c.description.toLowerCase().includes(adminCourseSearch.toLowerCase()) ||
              (c.instructor && c.instructor.toLowerCase().includes(adminCourseSearch.toLowerCase()))
            ).length === 0 ? (
              <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center space-y-3 shadow-sm">
                <BookOpen className="w-12 h-12 text-zinc-300 mx-auto" />
                <h4 className="font-bold text-zinc-700 text-base">Nenhum curso encontrado</h4>
                <p className="text-xs text-zinc-400">Tente ajustar o termo de pesquisa ou cadastre um novo curso.</p>
              </div>
            ) : adminCourseViewMode === "table" ? (
              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 text-zinc-500 uppercase font-black tracking-wider border-b border-zinc-200">
                      <tr>
                        <th className="px-5 py-3.5">Curso</th>
                        <th className="px-5 py-3.5">Categoria</th>
                        <th className="px-5 py-3.5">Instrutor</th>
                        <th className="px-5 py-3.5">Aulas / Carga</th>
                        <th className="px-5 py-3.5">Visibilidade</th>
                        <th className="px-5 py-3.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-medium text-zinc-800">
                      {courses.filter(c =>
                        c.title.toLowerCase().includes(adminCourseSearch.toLowerCase()) ||
                        c.category.toLowerCase().includes(adminCourseSearch.toLowerCase()) ||
                        c.description.toLowerCase().includes(adminCourseSearch.toLowerCase()) ||
                        (c.instructor && c.instructor.toLowerCase().includes(adminCourseSearch.toLowerCase()))
                      ).map((course) => (
                        <tr key={course.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                                style={course.gradientColor ? {
                                  background: course.gradientColor.includes(',') 
                                    ? `linear-gradient(135deg, ${course.gradientColor.split(',')[0].trim()}, ${course.gradientColor.split(',')[1].trim()})`
                                    : course.gradientColor
                                } : { background: 'linear-gradient(135deg, #0b439c, #000084)' }}
                              >
                                <BookOpen className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <div className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                                  {course.title}
                                  {course.isCustom && (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-yellow-400 text-zinc-950">
                                      Novo
                                    </span>
                                  )}
                                </div>
                                <div className="text-zinc-500 text-xs line-clamp-1 max-w-xs">
                                  {course.description}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#0b439c] border border-blue-100">
                              {course.category}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-zinc-700">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <User className="w-3.5 h-3.5 text-zinc-400" />
                              {course.instructor || "Instrutor da Plataforma"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-zinc-600">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                              {course.modules?.length || 1} Módulo(s) / Texto
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              course.visibility === 'Privado' ? 'bg-zinc-100 text-zinc-600' :
                              course.visibility === 'Rascunho' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {course.visibility || "Público"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenCourseInfo(course, "cursos_gestao")}
                                className="px-3.5 py-1.5 bg-[#0b439c] hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                                title="Ver Dados do Curso"
                              >
                                <Eye className="w-3.5 h-3.5 text-white" />
                                <span>Ver Dados</span>
                              </button>
                              <button
                                onClick={() => handleOpenEditCourse(course)}
                                className="p-1.5 text-zinc-500 hover:text-[#0b439c] hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                title="Editar Informações do Curso"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveCourse(course.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                title="Excluir Curso"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.filter(c =>
                  c.title.toLowerCase().includes(adminCourseSearch.toLowerCase()) ||
                  c.category.toLowerCase().includes(adminCourseSearch.toLowerCase()) ||
                  c.description.toLowerCase().includes(adminCourseSearch.toLowerCase()) ||
                  (c.instructor && c.instructor.toLowerCase().includes(adminCourseSearch.toLowerCase()))
                ).map((course) => (
                  <div key={course.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all group">
                    <div>
                      {/* Course Gradient Header */}
                      <div 
                        style={course.gradientColor ? {
                          background: course.gradientColor.includes(',') 
                            ? `linear-gradient(135deg, ${course.gradientColor.split(',')[0].trim()}, ${course.gradientColor.split(',')[1].trim()})`
                            : course.gradientColor
                        } : undefined}
                        className={`p-5 min-h-[110px] flex flex-col justify-between ${
                          course.gradientColor ? 'text-white shadow-xs' :
                          course.category === 'Back-end' ? 'bg-gradient-to-r from-emerald-800 to-emerald-950 text-white' :
                          course.category === 'Front-end' ? 'bg-gradient-to-r from-blue-800 to-indigo-950 text-white' :
                          course.category === 'Data Science' ? 'bg-gradient-to-r from-purple-800 to-purple-950 text-white' :
                          course.category === 'Scripts & DevOps' ? 'bg-gradient-to-r from-amber-700 to-amber-950 text-white' :
                          course.category === 'Automação' ? 'bg-gradient-to-r from-indigo-800 to-indigo-950 text-white' :
                          'bg-gradient-to-r from-[#0b439c] to-slate-950 text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs px-2.5 py-1 rounded-full">
                              {course.category}
                            </span>
                            {course.visibility && (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-black/30 text-white px-2.5 py-1 rounded-full">
                                {course.visibility}
                              </span>
                            )}
                            {course.isCustom && (
                              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-yellow-400 text-zinc-950">
                                <Sparkles className="w-2.5 h-2.5 fill-current" />
                                Novo
                              </span>
                            )}
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-xs flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <h4 className="font-display font-black text-white text-lg leading-tight line-clamp-2">
                          {course.title}
                        </h4>
                      </div>

                      {/* Body */}
                      <div className="p-5 space-y-3">
                        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-zinc-400 font-medium pt-2 border-t border-zinc-100">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-zinc-500" />
                            {course.instructor || "Instrutor da Plataforma"}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                            {course.modules?.length || 1} Módulo(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenCourseInfo(course, "cursos_gestao")}
                        className="px-4 py-2 bg-[#0b439c] hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-white" />
                        <span>Ver Dados</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditCourse(course)}
                          className="p-2 text-zinc-500 hover:text-[#0b439c] hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                          title="Editar Informações do Curso"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveCourse(course.id)}
                          className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          title="Excluir Curso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}





        {/* ==================== TAB 3: LESSON VIEW & INTERACTIVE PLAYER ==================== */}
        {activeTab === "lesson-view" && selectedCourse && (
          isViewingCourseInfo ? (
            /* Course Info and Grade Overview View */
            <div className="space-y-6 animate-fade-in">
              {/* Top Navigation - Simple Clean Back Button */}
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200/80 pb-3">
                <button
                  onClick={() => {
                    setIsViewingCourseInfo(false);
                    if (courseInfoSourceTab === "cursos_gestao") {
                      setActiveTab("cursos_gestao");
                    } else if (courseInfoSourceTab === "dashboard") {
                      setActiveTab("dashboard");
                    } else {
                      if (selectedCourse?.id_trilha) {
                        setSelectedTrilhaId(String(selectedCourse.id_trilha));
                      }
                      setActiveTab("courses");
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition-colors cursor-pointer border border-zinc-200 shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4 text-zinc-700" />
                  <span>Voltar</span>
                </button>
              </div>

              {/* Course Header Banner with Welcome & Chips */}
              <div
                style={selectedCourse.gradientColor ? {
                  background: selectedCourse.gradientColor.includes(',') 
                    ? `linear-gradient(135deg, ${selectedCourse.gradientColor.split(',')[0].trim()}, ${selectedCourse.gradientColor.split(',')[1].trim()})`
                    : selectedCourse.gradientColor
                } : undefined}
                className={`p-6 md:p-8 rounded-2xl shadow-sm space-y-3 ${
                  selectedCourse.gradientColor ? 'text-white' : 'bg-gradient-to-r from-[#0b439c] to-indigo-900 text-white'
                }`}
              >
                {/* Welcome Greeting */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold shadow-2xs">
                  <span>Seja bem-vindo(a) ao curso!</span>
                </div>

                {/* Course Title */}
                <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight text-white leading-tight">
                  {selectedCourse.title}
                </h2>

                {/* Chips (Chipolines / Badges) */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs border border-white/20 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" />
                    {selectedCourse.category}
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs border border-white/20 flex items-center gap-1.5">
                    <Layers className="w-3 h-3" />
                    {selectedCourse.modules?.length || 0} Módulos • {selectedCourse.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0} Aulas
                  </span>
                  {(courseInfoSourceTab === "cursos_gestao" || accountType === "administrador" || accountType === "instrutor") && (
                    <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500/30 text-amber-100 border border-amber-400/30">
                      Modo Gestão / Edição
                    </span>
                  )}
                </div>
              </div>

              {/* Primary Action Button Row below gradient banner */}
              <div className="flex flex-wrap items-center gap-3">
                {courseInfoSourceTab === "cursos_gestao" || accountType === "administrador" || accountType === "instrutor" ? (
                  /* Admin & Instructor Management Actions */
                  <>
                    <button
                      onClick={() => {
                        setModuleLessonCourse(selectedCourse);
                        setAddType("module");
                        setAddModuleTitle("");
                        setAddLessonTitle("");
                        setAddLessonContent("");
                        setSelectedTargetModuleIndex(0);
                      }}
                      className="px-5 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Módulo / Aula
                    </button>

                    <button
                      onClick={() => handleOpenEditCourse(selectedCourse)}
                      className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 border border-zinc-200"
                    >
                      <Edit3 className="w-4 h-4 text-zinc-600" />
                      Editar Dados do Curso
                    </button>

                    <button
                      onClick={() => handleRemoveCourse(selectedCourse.id)}
                      className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 border border-red-200"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                      Excluir Curso
                    </button>
                  </>
                ) : (
                  /* Student Actions */
                  getCourseProgress(selectedCourse) === 100 ? (
                    <span className="px-4 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      Curso Concluído com Sucesso
                    </span>
                  ) : getCourseProgress(selectedCourse) > 0 ? (
                    <button
                      onClick={() => handleContinueCourse(selectedCourse)}
                      className="px-5 py-2.5 bg-[#0b439c] text-white hover:bg-blue-800 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current text-white" />
                      Continuar Curso ({getCourseProgress(selectedCourse)}%)
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectLesson(selectedCourse, 0, 0)}
                      className="px-5 py-2.5 bg-[#0b439c] text-white hover:bg-blue-800 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current text-white" />
                      Iniciar Curso (Aula 1)
                    </button>
                  )
                )}
              </div>

              {/* Details & Grade Sections Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left side: Description & Instructor Profile & Progress (4 cols on lg) */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Course Description */}
                  <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-3">
                    <h4 className="font-display font-bold text-sm text-zinc-900 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 pb-2">
                      <FileText className="w-4 h-4 text-[#0b439c]" />
                      Descrição do Curso
                    </h4>
                    <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                      {selectedCourse.description}
                    </p>
                  </div>

                  {/* Instructor Section (Right after Description) */}
                  {(() => {
                    const instructorName = selectedCourse.instructor || "Instrutor da Plataforma";
                    const instructorUser = allUsers.find(
                      (u) => u.name && u.name.toLowerCase().trim() === instructorName.toLowerCase().trim()
                    );
                    const avatarUrl =
                      instructorPhotoUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=0b439c&color=fff&bold=true`;

                    return (
                      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-3">
                        <h4 className="font-display font-bold text-sm text-zinc-900 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 pb-2">
                          <UserCheck className="w-4 h-4 text-[#0b439c]" />
                          Instrutor do Curso
                        </h4>

                        <div className="flex items-center gap-3">
                          <img
                            src={avatarUrl}
                            alt={instructorName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-[#0b439c]/20 shadow-xs shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(instructorName)}&background=0b439c&color=fff&bold=true`;
                            }}
                          />
                          <div>
                            <h5 className="font-bold text-base text-zinc-900 leading-tight">{instructorName}</h5>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {courseInfoSourceTab === "cursos_gestao" || accountType === "administrador" || accountType === "instrutor" ? (
                    /* Admin/Instructor Specs Box */
                    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-3">
                      <h4 className="font-display font-bold text-sm text-zinc-900 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 pb-2">
                        <BookOpen className="w-4 h-4 text-[#0b439c]" />
                        Ficha Técnica de Gestão
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-zinc-50">
                          <span className="text-zinc-500 font-medium">Instrutor Responsável:</span>
                          <span className="font-bold text-zinc-800">{selectedCourse.instructor || "Instrutor da Plataforma"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-50">
                          <span className="text-zinc-500 font-medium">Categoria:</span>
                          <span className="font-bold text-zinc-800">{selectedCourse.category}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-50">
                          <span className="text-zinc-500 font-medium">Visibilidade:</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {selectedCourse.visibility || "Público"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-zinc-50">
                          <span className="text-zinc-500 font-medium">Total de Módulos:</span>
                          <span className="font-bold text-[#0b439c]">{selectedCourse.modules?.length || 0}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-zinc-500 font-medium">Total de Aulas:</span>
                          <span className="font-bold text-[#0b439c]">
                            {selectedCourse.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Student Progress Box */
                    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-3">
                      <h4 className="font-display font-bold text-sm text-zinc-900 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 pb-2">
                        <Award className="w-4 h-4 text-[#0b439c]" />
                        Seu Progresso
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-zinc-600">Porcentagem</span>
                          <span className="text-[#0b439c]">{getCourseProgress(selectedCourse)}%</span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#0b439c] h-full rounded-full transition-all duration-300"
                            style={{ width: `${getCourseProgress(selectedCourse)}%` }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleContinueCourse(selectedCourse)}
                        className="w-full mt-2 py-3 px-4 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        {getCourseProgress(selectedCourse) >= 100 ? "Ver Curso" : getCourseProgress(selectedCourse) > 0 ? "Continuar Curso" : "Iniciar Curso"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Right side: Modules & Lessons Management (8 cols on lg) */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
                    <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                      <h4 className="font-display font-bold text-sm text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#0b439c]" />
                        Estrutura De Módulos E Aulas
                      </h4>
                      {(courseInfoSourceTab === "cursos_gestao" || accountType === "administrador" || accountType === "instrutor") ? (
                        <button
                          onClick={() => {
                            setModuleLessonCourse(selectedCourse);
                            setAddType("module");
                            setAddModuleTitle("");
                            setAddLessonTitle("");
                            setAddLessonContent("");
                            setSelectedTargetModuleIndex(0);
                          }}
                          className="px-3 py-1.5 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Novo Módulo
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-500 font-semibold">
                          {selectedCourse.modules?.length || 0} Módulos
                        </span>
                      )}
                    </div>

                    <div className="divide-y divide-zinc-200">
                      {selectedCourse.modules?.map((module, mIdx) => (
                        <div key={mIdx} className="p-4 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h5 className="font-bold text-xs text-zinc-800 uppercase tracking-wide flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-blue-50 text-[#0b439c] border border-blue-100 flex items-center justify-center font-black text-[10px]">
                                {mIdx + 1}
                              </span>
                              {module.title}
                            </h5>
                            
                            {(courseInfoSourceTab === "cursos_gestao" || accountType === "administrador" || accountType === "instrutor") ? (
                              <button
                                onClick={() => {
                                  setModuleLessonCourse(selectedCourse);
                                  setAddType("lesson");
                                  setAddModuleTitle("");
                                  setAddLessonTitle("");
                                  setAddLessonContent("");
                                  setSelectedTargetModuleIndex(mIdx);
                                }}
                                className="px-2.5 py-1 bg-zinc-100 hover:bg-blue-50 text-zinc-700 hover:text-[#0b439c] font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1 border border-zinc-200"
                              >
                                <Plus className="w-3 h-3" />
                                Adicionar Aula
                              </button>
                            ) : (
                              <span className="text-[11px] text-zinc-400 font-medium">
                                {module.lessons?.length || 0} Aulas
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 pl-2">
                            {module.lessons?.map((lesson, lIdx) => {
                              const isCompleted = isLessonCompleted(selectedCourse.id, mIdx, lIdx);
                              return (
                                <div
                                  key={lIdx}
                                  className="p-3 bg-zinc-50 border border-zinc-150 rounded-xl flex items-center justify-between gap-3 transition-all group"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {(courseInfoSourceTab === "cursos_gestao" || accountType === "administrador" || accountType === "instrutor") ? (
                                      <BookOpen className="w-4 h-4 text-[#0b439c] shrink-0" />
                                    ) : isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    ) : (
                                      <Play className="w-4 h-4 text-zinc-400 group-hover:text-[#0b439c] shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-zinc-800 truncate">
                                        Aula {lIdx + 1}: {lesson.title}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {(courseInfoSourceTab === "cursos_gestao" || accountType === "administrador" || accountType === "instrutor") ? (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingLesson({
                                              courseId: selectedCourse.id,
                                              moduleIndex: mIdx,
                                              lessonIndex: lIdx,
                                              title: lesson.title,
                                              content: lesson.content || ""
                                            });
                                          }}
                                          className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-700 font-bold text-[11px] rounded-lg border border-zinc-200 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                        >
                                          <Edit3 className="w-3 h-3 text-zinc-500" />
                                          Editar
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteLesson(selectedCourse.id, mIdx, lIdx);
                                          }}
                                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] rounded-lg border border-red-200 transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          Excluir
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleSelectLesson(selectedCourse, mIdx, lIdx)}
                                        className="text-xs font-bold text-[#0b439c] hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        Ver Aula <ChevronRight className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* Standard Lesson Player with Left Sidebar */
            <div className="space-y-6">
              
              {/* Top Header Bar */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
                {/* Left: Back button + Course Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => {
                      setIsViewingCourseInfo(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl transition-all cursor-pointer border border-zinc-200 shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4 text-zinc-700" />
                    <span>Voltar</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 truncate max-w-xs sm:max-w-md md:max-w-xl">
                    <button
                      onClick={() => setIsViewingCourseInfo(true)}
                      className="font-bold text-zinc-700 hover:text-[#0b439c] hover:underline transition-colors truncate"
                      title={selectedCourse.title}
                    >
                      {selectedCourse.title}
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-extrabold text-zinc-900 truncate" title={selectedCourse.modules?.[selectedModuleIndex]?.lessons?.[selectedLessonIndex]?.title || "Aula"}>
                      {selectedCourse.modules?.[selectedModuleIndex]?.lessons?.[selectedLessonIndex]?.title || "Aula"}
                    </span>
                  </div>
                </div>

                {/* Right: User Avatar + User Name */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[#0b439c] text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {(studentName || "E").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-zinc-800 max-w-[120px] sm:max-w-[200px] truncate">
                    {studentName || user?.user_metadata?.full_name || "Estudante"}
                  </span>
                </div>
              </div>

              {/* Layout Split: Left Course Modules Sidebar, Center Markdown Content */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column (3 span): Module Navigation Sidebar */}
                <div className="lg:col-span-3 space-y-4">
                  {/* Module Selector Dropdown Card */}
                  <div className="relative">
                    <button
                      onClick={() => setIsModuleDropdownOpen(!isModuleDropdownOpen)}
                      className="w-full bg-white border border-zinc-200 hover:border-blue-300 rounded-xl p-3.5 text-left transition-all shadow-xs flex items-center justify-between gap-2 cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">
                          Módulo Selecionado
                        </span>
                        <p className="text-xs font-bold text-zinc-900 truncate">
                          Módulo {selectedModuleIndex + 1}: {selectedCourse.modules[selectedModuleIndex]?.title}
                        </p>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition-transform shrink-0 ${isModuleDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Dropdown Menu listing all Modules */}
                    <AnimatePresence>
                      {isModuleDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 5, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.98 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-zinc-100 max-h-64 overflow-y-auto"
                        >
                          <div className="p-2.5 bg-zinc-50 text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                            Selecione o Módulo ({selectedCourse.modules.length})
                          </div>
                          {selectedCourse.modules.map((mod, mIdx) => {
                            const isCurrentMod = selectedModuleIndex === mIdx;
                            return (
                              <button
                                key={mIdx}
                                onClick={() => {
                                  setSelectedModuleIndex(mIdx);
                                  setSelectedLessonIndex(0);
                                  setIsModuleDropdownOpen(false);
                                }}
                                className={`w-full text-left p-3 text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                  isCurrentMod
                                    ? "bg-blue-50 text-[#0b439c] font-bold"
                                    : "text-zinc-700 hover:bg-zinc-50"
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="block text-[10px] text-zinc-400 font-bold uppercase">Módulo {mIdx + 1}</span>
                                  <p className="truncate font-semibold">{mod.title}</p>
                                </div>
                                {isCurrentMod && <CheckCircle2 className="w-4 h-4 text-[#0b439c] shrink-0" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Lessons List for the Selected Module */}
                  <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs p-2 space-y-1">
                    <div className="px-2.5 py-2 border-b border-zinc-100 flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                        Aulas ({selectedCourse.modules[selectedModuleIndex]?.lessons?.length || 0})
                      </span>
                      <span className="text-[10px] font-bold text-[#0b439c] bg-blue-50 px-2 py-0.5 rounded">
                        Módulo {selectedModuleIndex + 1}
                      </span>
                    </div>

                    <div className="space-y-1 pt-1 max-h-[420px] overflow-y-auto pr-1">
                      {selectedCourse.modules[selectedModuleIndex]?.lessons?.map((les, lIdx) => {
                        const isSelected = selectedLessonIndex === lIdx;
                        const isCompleted = isLessonCompleted(selectedCourse.id, selectedModuleIndex, lIdx);
                        return (
                          <button
                            key={lIdx}
                            onClick={() => handleSelectLesson(selectedCourse, selectedModuleIndex, lIdx)}
                            className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                              isSelected
                                ? "bg-[#0b439c] text-white font-semibold shadow-xs"
                                : "text-zinc-700 hover:bg-zinc-50"
                            }`}
                          >
                            <span className="shrink-0 mt-0.5">
                              {isCompleted ? (
                                <CheckCircle2 className={`w-4 h-4 ${isSelected ? "text-white" : "text-emerald-600"}`} />
                              ) : (
                                <Play className={`w-4 h-4 ${isSelected ? "text-white" : "text-zinc-400"}`} />
                              )}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="truncate leading-tight font-medium">Aula {lIdx + 1}: {les.title}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Course Completion panel if done */}
                  {getCourseProgress(selectedCourse) === 100 && (
                    <div className="bg-gradient-to-tr from-[#0b439c] to-indigo-950 text-white rounded-xl p-4 shadow-sm text-center space-y-2 animate-fade-in">
                      <h5 className="font-display font-extrabold text-sm">Curso Concluído! 🎓</h5>
                      <p className="text-[11px] text-blue-100">Parabéns! Você concluiu 100% das aulas deste curso.</p>
                    </div>
                  )}
                </div>

                {/* Center Column: Lesson Content Panel */}
                <div className="lg:col-span-9 space-y-6">
                  {selectedCourse.modules[selectedModuleIndex]?.lessons[selectedLessonIndex] ? (
                    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                      {/* Lesson Banner */}
                      <div className="p-6 bg-gradient-to-r from-zinc-900 to-zinc-950 text-white flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 bg-white/10 px-2 py-0.5 rounded">
                          Aula Ativa
                        </span>
                        <h3 className="font-display font-extrabold text-xl mt-1 tracking-tight">
                          {selectedCourse.modules[selectedModuleIndex].lessons[selectedLessonIndex].title}
                        </h3>
                      </div>
                    </div>

                    {/* Rich Rendered Content - Protegido contra cópia de texto didático */}
                    <div 
                      className="lesson-protected-area p-6 md:p-8 space-y-6 select-none"
                      onCopy={(e) => {
                        const selection = window.getSelection();
                        const selectedText = selection ? selection.toString().trim() : "";
                        if (!selectedText) return;
                        const anchor = selection?.anchorNode;
                        const elem = anchor instanceof Element ? anchor : anchor?.parentElement;
                        if (elem && !elem.closest("pre, code, .code-copyable, input, textarea")) {
                          e.preventDefault();
                          setLessonCopyWarning("Atenção: Os textos explicativos e lições são protegidos pelos Termos de Uso. É permitida apenas a cópia de códigos de programação.");
                          setTimeout(() => setLessonCopyWarning(null), 5000);
                        }
                      }}
                      onContextMenu={(e) => {
                        const target = e.target as HTMLElement;
                        if (!target.closest("pre, code, .code-copyable, input, textarea")) {
                          e.preventDefault();
                          setLessonCopyWarning("Atenção: A cópia de textos explicativos é restrita pelos Termos de Uso. Apenas códigos de programação podem ser copiados.");
                          setTimeout(() => setLessonCopyWarning(null), 4000);
                        }
                      }}
                    >
                      {lessonCopyWarning && (
                        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-bold flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
                          <div className="flex items-center gap-2.5">
                            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                            <span>{lessonCopyWarning}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLessonCopyWarning(null)}
                            className="text-amber-800 hover:text-amber-950 font-black text-xs px-2 py-1 rounded-lg hover:bg-amber-100 cursor-pointer"
                          >
                            Entendi
                          </button>
                        </div>
                      )}
                      <div 
                        ref={(node) => {
                          if (node) {
                            const scripts = node.querySelectorAll("script");
                            scripts.forEach((oldScript) => {
                              if (!oldScript.dataset.executed) {
                                oldScript.dataset.executed = "true";
                                const newScript = document.createElement("script");
                                Array.from(oldScript.attributes).forEach((attr: any) => newScript.setAttribute(attr.name, attr.value));
                                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                                oldScript.parentNode?.replaceChild(newScript, oldScript);
                              }
                            });
                          }
                        }}
                        className="markdown-body prose max-w-none text-zinc-800 text-sm md:text-base leading-relaxed space-y-4"
                        dangerouslySetInnerHTML={{ 
                          __html: parseMarkdown(selectedCourse.modules[selectedModuleIndex].lessons[selectedLessonIndex].content) 
                        }}
                      />

                      {/* Studio / Project Box for "Meu projeto" or [abir projeto] / [abrir projeto] lessons */}
                      {(() => {
                        const activeLes = selectedCourse.modules[selectedModuleIndex].lessons[selectedLessonIndex];
                        const lesTitle = (activeLes?.title || "").toLowerCase();
                        const lesContent = (activeLes?.content || "").toLowerCase();

                        const hasAbrirProjeto = lesContent.includes("[abir projeto]") || 
                                                lesContent.includes("[abrir projeto]") || 
                                                lesTitle.includes("meu projeto");

                        const hasFinalizarProjeto = lesContent.includes("[finalizar projeto]") || 
                                                    lesContent.includes("[enviar projeto]") || 
                                                    lesTitle.includes("enviar");

                        return (
                          <>
                            {hasAbrirProjeto && (
                              <div className="mt-8 pt-6 border-t border-zinc-150 space-y-5">
                                {/* Card Header */}
                                <div className="bg-[#f0f2f5] border border-zinc-200/80 rounded-2xl p-5 md:p-6 flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-[#0d1627] flex items-center justify-center shrink-0 shadow-xs">
                                    <Code className="w-6 h-6 text-cyan-400" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-zinc-900 text-base md:text-lg tracking-tight">
                                      É hora de programar!
                                    </h4>
                                    <p className="text-xs md:text-sm text-zinc-500 italic font-medium mt-0.5">
                                      Vamos para o Estúdio Programa Certo
                                    </p>
                                  </div>
                                </div>

                                {/* Button */}
                                <div>
                                  <button
                                    onClick={handleOpenStudioProject}
                                    className="px-6 py-2.5 bg-gradient-to-r from-[#0c3880] via-[#0d52be] to-[#0089d8] hover:opacity-95 text-white font-bold text-xs md:text-sm rounded-full shadow-md shadow-blue-900/15 flex items-center gap-2 transition-all cursor-pointer"
                                  >
                                    <span>Abrir meu projeto</span>
                                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {hasFinalizarProjeto && (
                              <div className="mt-8 pt-6 border-t border-zinc-150 space-y-5">
                                {/* Card Header & Input */}
                                <div className="bg-[#f0f2f5] border border-zinc-200/80 rounded-2xl p-5 md:p-6 space-y-4">
                                  <div className="flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-xl bg-[#0d1627] flex items-center justify-center shrink-0 shadow-xs">
                                        <Upload className="w-6 h-6 text-cyan-400" />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-zinc-900 text-base md:text-lg tracking-tight">
                                          Envie seu projeto
                                        </h4>
                                        <p className="text-xs md:text-sm text-zinc-500 italic font-medium mt-0.5">
                                          Coloque o ID do seu projeto aqui
                                        </p>
                                      </div>
                                    </div>

                                    {/* Status Badge */}
                                    {currentProjectProgress?.status && (
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                                          currentProjectProgress.status === "Finalizado"
                                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                            : "bg-amber-100 text-amber-800 border-amber-300"
                                        }`}>
                                          ● Status: {currentProjectProgress.status}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Registered ID indicator */}
                                  {currentProjectProgress?.id_epc && (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-2 flex-wrap">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>ID Cadastrado: <strong className="font-mono text-emerald-900">{currentProjectProgress.id_epc}</strong></span>
                                      </div>
                                      <span className="text-[11px] text-emerald-700 font-medium">(Você pode editar e reenviar o ID abaixo)</span>
                                    </div>
                                  )}

                                  {/* Input Field */}
                                  <div className="pt-2">
                                    <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                                      ID do projeto
                                    </label>
                                    <input
                                      type="text"
                                      value={projectIdInput}
                                      onChange={(e) => setProjectIdInput(e.target.value)}
                                      placeholder="Digite ou cole o ID do seu projeto..."
                                      className="w-full px-4 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                  </div>
                                </div>

                                {/* Button */}
                                <div>
                                  <button
                                    onClick={handleSendProjectId}
                                    className="px-6 py-2.5 bg-gradient-to-r from-[#0c3880] via-[#0d52be] to-[#0089d8] hover:opacity-95 text-white font-bold text-xs md:text-sm rounded-full shadow-md shadow-blue-900/15 flex items-center gap-2 transition-all cursor-pointer"
                                  >
                                    <span>{currentProjectProgress?.id_epc ? "Reenviar ID de projeto" : "Enviar ID de projeto"}</span>
                                    <Send className="w-3.5 h-3.5 fill-current ml-0.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* Interactive Quiz Area */}
                      {selectedCourse.modules[selectedModuleIndex].lessons[selectedLessonIndex].quiz && 
                       selectedCourse.modules[selectedModuleIndex].lessons[selectedLessonIndex].quiz.length > 0 && (
                        <div className="mt-10 pt-8 border-t border-zinc-150 space-y-6">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="w-5 h-5 text-blue-700" />
                            <h4 className="font-display font-bold text-lg text-zinc-900">
                              Teste de Fixação da Aula
                            </h4>
                          </div>

                          {selectedCourse.modules[selectedModuleIndex].lessons[selectedLessonIndex].quiz.map((quizItem, qIdx) => (
                            <div key={qIdx} className="space-y-4">
                              <p className="text-sm font-semibold text-zinc-800 bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                                {quizItem.question}
                              </p>

                              <div className="grid grid-cols-1 gap-2.5">
                                {quizItem.options.map((opt, oIdx) => (
                                  <button
                                    key={oIdx}
                                    onClick={() => !quizSubmitted && setSelectedAnswer(oIdx)}
                                    disabled={quizSubmitted}
                                    className={`w-full text-left p-3.5 rounded-lg text-xs md:text-sm border transition-all ${
                                      selectedAnswer === oIdx
                                        ? "bg-blue-50 border-blue-600 font-semibold text-blue-900 shadow-sm"
                                        : "bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50"
                                    } ${
                                      quizSubmitted && quizItem.correctAnswer === oIdx
                                        ? "bg-emerald-50 border-emerald-600 text-emerald-900 font-bold"
                                        : ""
                                    } ${
                                      quizSubmitted && selectedAnswer === oIdx && quizItem.correctAnswer !== oIdx
                                        ? "bg-red-50 border-red-600 text-red-900"
                                        : ""
                                    }`}
                                  >
                                    <span className="font-bold mr-2">{String.fromCharCode(65 + oIdx)})</span>
                                    {opt}
                                  </button>
                                ))}
                              </div>

                              {/* Action and feedback */}
                              {!quizSubmitted ? (
                                <button
                                  onClick={() => handleQuizSubmit(quizItem)}
                                  disabled={selectedAnswer === null}
                                  className="px-5 py-2.5 rounded-lg bg-[#0b439c] hover:bg-blue-800 disabled:bg-zinc-300 disabled:text-zinc-500 text-white font-bold text-sm transition-colors shadow-sm"
                                >
                                  Enviar Resposta
                                </button>
                              ) : (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`p-4 rounded-xl border ${
                                    quizScore 
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                                      : "bg-red-50 border-red-200 text-red-800"
                                  } space-y-1.5`}
                                >
                                  <div className="flex items-center gap-2 font-bold text-sm">
                                    {quizScore ? (
                                      <>
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        Resposta Correta! Aula Concluída.
                                      </>
                                    ) : (
                                      <>
                                        <X className="w-5 h-5 text-red-600" />
                                        Resposta Incorreta. Tente novamente!
                                      </>
                                    )}
                                  </div>
                                  <p className="text-xs leading-relaxed">{quizItem.explanation}</p>
                                  
                                  {!quizScore && (
                                    <button
                                      onClick={() => {
                                        setSelectedAnswer(null);
                                        setQuizSubmitted(false);
                                        setQuizScore(null);
                                      }}
                                      className="mt-2 text-xs font-bold text-red-700 hover:underline flex items-center gap-1"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      Tentar Novamente
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Bottom Lesson Navigation (Next Lesson Button) */}
                      {(() => {
                        const currentMod = selectedCourse.modules[selectedModuleIndex];
                        const totalMods = selectedCourse.modules.length;
                        const totalLes = currentMod?.lessons?.length || 0;

                        let hasNextLesson = false;
                        let nextModIdx = selectedModuleIndex;
                        let nextLesIdx = selectedLessonIndex + 1;

                        if (selectedLessonIndex < totalLes - 1) {
                          hasNextLesson = true;
                        } else if (selectedModuleIndex < totalMods - 1) {
                          if (selectedCourse.modules[selectedModuleIndex + 1]?.lessons?.length > 0) {
                            hasNextLesson = true;
                            nextModIdx = selectedModuleIndex + 1;
                            nextLesIdx = 0;
                          }
                        }

                        return (
                          <div className="mt-10 pt-6 border-t border-zinc-200 flex items-center justify-end">
                            {hasNextLesson ? (
                              <button
                                onClick={() => {
                                  handleSelectLesson(selectedCourse, nextModIdx, nextLesIdx);
                                  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
                                }}
                                className="px-6 py-3 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs md:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                              >
                                <span>Próxima Aula</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setIsViewingCourseInfo(true);
                                  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
                                }}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Concluir Curso / Ver Visão Geral</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center text-zinc-500 shadow-sm">
                    Carregando lição...
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}

        {/* ==================== TAB: PERFIL DO ESTUDANTE (FULL PAGE VIEW) ==================== */}
        {activeTab === "perfil" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto space-y-8"
          >
            {/* Profile Content Card */}
            <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm p-6 sm:p-10 space-y-8">
              {/* Profile Header: Large Avatar on Left, Name & Email & Details on Right */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 pb-8 border-b border-zinc-100">
                {/* Avatar / Person's Logo (large, on left side) */}
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-tr from-[#0b439c] via-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-3xl sm:text-4xl shadow-lg shadow-blue-900/15 shrink-0 border-4 border-white ring-2 ring-blue-100">
                  {studentName.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U"}
                </div>

                {/* Name, Email, and Role details */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-1 min-w-0">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-[#0b439c] text-xs font-bold uppercase tracking-wider">
                      <User className="w-3.5 h-3.5" />
                      <span>Conta de {accountType === "administrador" ? "Administrador" : accountType === "instrutor" ? "Instrutor" : "Estudante"}</span>
                    </div>

                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight truncate">
                        {studentName}
                      </h1>
                      <p className="text-sm sm:text-base font-semibold text-zinc-500 mt-0.5 truncate flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>{user ? user.email : "Acesso Offline / Local"}</span>
                      </p>
                      {user && (
                        <p className="text-xs font-mono text-zinc-600 mt-1 bg-zinc-50 border border-zinc-200/80 px-2.5 py-1 rounded-lg inline-block">
                          Matrícula: <span className="font-black text-[#0b439c]">{extractMatricula((user as any)?.matricula || user.id, allUsers)}</span>
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400">
                      Membro da plataforma de aprendizagem Programa Certo
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await handleLogout();
                    }}
                    className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-2xs shrink-0"
                    title="Sair da Conta"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair da Conta</span>
                  </button>
                </div>
              </div>

              {/* Platform Administration Metrics */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Visão Geral Administrativa
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Usuários Cadastrados */}
                  <div className="bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-200/70 rounded-2xl p-5 sm:p-6 transition-all shadow-2xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Usuários no Sistema
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-[#0b439c] flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-[#0b439c]">
                      {allUsers.length}
                    </div>
                    <p className="text-xs text-zinc-500 font-medium mt-1">
                      Perfis registrados na plataforma
                    </p>
                  </div>

                  {/* Total de Atendimentos */}
                  <div className="bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-200/70 rounded-2xl p-5 sm:p-6 transition-all shadow-2xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Atendimentos
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center">
                        <LifeBuoy className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-purple-700">
                      {tickets.length}
                    </div>
                    <p className="text-xs text-zinc-500 font-medium mt-1">
                      Total de chamados na central
                    </p>
                  </div>

                  {/* Atendimentos Concluídos */}
                  <div className="bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-200/70 rounded-2xl p-5 sm:p-6 transition-all shadow-2xs">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Chamados Concluídos
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-emerald-700">
                      {tickets.filter(t => t.status === "Concluído").length}
                    </div>
                    <p className="text-xs text-zinc-500 font-medium mt-1">
                      Respostas oficiais enviadas
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit Student Data Form */}
              <div className="pt-6 border-t border-zinc-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Dados do Usuário
                  </h3>
                  {isEditingProfile && (
                    <span className="text-[11px] font-bold text-[#0b439c] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                      Modo de Edição Ativo
                    </span>
                  )}
                </div>

                {/* Mensagens de Sucesso ou Erro da Edição de Perfil */}
                {profileUpdateSuccessMsg && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{profileUpdateSuccessMsg}</span>
                  </div>
                )}
                {profileUpdateErrorMsg && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-800 flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{profileUpdateErrorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Campo 1: Nome */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                      Nome
                    </label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editProfileName}
                        onChange={(e) => setEditProfileName(e.target.value)}
                        placeholder="Seu nome"
                        className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                      />
                    ) : (
                      <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 select-none cursor-default">
                        {studentName}
                      </div>
                    )}
                    <p className="text-[11px] text-zinc-400">
                      Nome exibido no seu perfil e nas interações da plataforma.
                    </p>
                  </div>

                  {/* Campo 2: Endereço de E-mail */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                      Endereço de E-mail
                    </label>
                    {isEditingProfile ? (
                      <input
                        type="email"
                        value={editProfileEmail}
                        onChange={(e) => setEditProfileEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                      />
                    ) : (
                      <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-800 select-none cursor-default truncate">
                        {user ? user.email : "Acesso Offline / Local"}
                      </div>
                    )}
                    <p className="text-[11px] text-zinc-400">
                      Identificador de acesso associado à sua conta.
                    </p>
                  </div>

                  {/* Campo 3: Mudar a Senha */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                      Mudar a Senha
                    </label>
                    {isEditingProfile ? (
                      <div className="relative">
                        <input
                          type={showEditProfilePassword ? "text" : "password"}
                          value={editProfilePassword}
                          onChange={(e) => setEditProfilePassword(e.target.value)}
                          placeholder="Nova senha (opcional)"
                          className="w-full bg-white border-2 border-[#0b439c] rounded-xl pl-4 pr-11 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEditProfilePassword(!showEditProfilePassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-all p-1 cursor-pointer"
                          title={showEditProfilePassword ? "Ocultar senha" : "Ver senha"}
                        >
                          {showEditProfilePassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-400 select-none cursor-default tracking-widest font-mono">
                        ••••••••••••
                      </div>
                    )}
                    <p className="text-[11px] text-zinc-400">
                      {isEditingProfile
                        ? "Deixe em branco para manter a atual (mínimo 6 caracteres)."
                        : "Senha de acesso protegida por criptografia."}
                    </p>
                  </div>
                </div>

                {/* Botões de Ação para Edição */}
                <div className="pt-2">
                  {!isEditingProfile ? (
                    <button
                      type="button"
                      id="btn-edit-profile-data"
                      onClick={handleStartEditProfile}
                      className="px-5 py-2.5 bg-[#0b439c] hover:bg-blue-800 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center gap-2 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Editar Dados</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleCancelEditProfile}
                        className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        id="btn-save-profile-data"
                        onClick={handleSaveProfileData}
                        className="px-6 py-2.5 bg-[#0b439c] hover:bg-blue-800 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Salvar Dados</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Informações da Conta: Data da Criação da Conta */}
              <div className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-50/80 rounded-2xl p-4 sm:p-5 border border-zinc-200/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0b439c] flex items-center justify-center shrink-0 shadow-2xs">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Data da criação da conta
                    </span>
                    <span className="text-sm font-extrabold text-zinc-900">
                      {getAccountCreationDateDisplay()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  <span className="text-xs font-bold text-emerald-700">Conta Ativa</span>
                </div>
              </div>

              {/* Exclusão Permanente da Conta */}
              <div className="pt-6 border-t border-zinc-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 bg-zinc-50/80 rounded-2xl p-5 sm:p-6 border border-zinc-200/70">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2 text-zinc-900 font-extrabold text-sm tracking-tight">
                    <div className="w-7 h-7 rounded-lg bg-zinc-200/80 text-zinc-700 flex items-center justify-center shrink-0">
                      <Trash2 className="w-4 h-4 text-zinc-600" />
                    </div>
                    <span>Excluir Conta</span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                    Ao solicitar a exclusão da sua conta, todos os seus dados cadastrais, cursos concluídos e lições finalizadas serão excluídos. Esta ação não pode ser desfeita.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-delete-account-profile"
                  onClick={() => {
                    setIsDeleteAccountModalOpen(true);
                    setDeleteAccountStep(1);
                    setDeleteAccountCode("");
                    setDeleteAccountError(null);
                    setDeleteAccountSuccess(null);
                  }}
                  className="px-5 py-2.5 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-zinc-300 text-zinc-700 font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Excluir Conta</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== TAB: TERMO DE USO (FULL PAGE VIEW) ==================== */}
        {activeTab === "termos" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto space-y-6"
          >
            {/* Terms of Use Document Container */}
            <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm p-6 sm:p-10 space-y-6">
              <div className="border-b border-zinc-100 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#0b439c]">
                      Documento Oficial
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      Atualizado para todos os usuários
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                    Termo de Uso e Privacidade
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                    Diretrizes de utilização da plataforma e proteção de dados pessoais
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopyTerms}
                    className="px-4 py-2.5 bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    {termsCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-extrabold">Termo Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-zinc-500" />
                        <span>Copiar Termo Completo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <TermsOfUseView
                isModal={false}
                termsCopied={termsCopied}
                onCopyTerms={handleCopyTerms}
              />
            </div>
          </motion.div>
        )}

        {/* ==================== TAB: CENTRAL DE ATENDIMENTO ==================== */}
        {activeTab === "atendimento" && (() => {
          // Se o administrador clicou em "Ver Usuário" dentro de um atendimento, abre a ficha completa do usuário aqui mesmo com botão "Voltar para Atendimento"
          if (editingUser && editingUserFromAtendimento) {
            const userMat = extractMatricula(editingUser.matricula || editingUser.id, allUsers);
            return (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto space-y-6"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null);
                      setEditingUserFromAtendimento(false);
                      scrollToTop();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold text-xs transition-all shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 text-zinc-500" />
                    <span>Voltar para Atendimento</span>
                  </button>
                </div>

                <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm p-6 sm:p-10 space-y-8">
                  {/* Cartão de Perfil do Usuário */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8 pb-8 border-b border-zinc-100">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-tr from-[#0b439c] via-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-3xl sm:text-4xl shadow-lg shadow-blue-900/15 shrink-0 border-4 border-white ring-2 ring-blue-100">
                      {(editUserName || editingUser.name || "U").split(" ").filter(Boolean).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>

                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-[#0b439c] text-xs font-bold uppercase tracking-wider">
                          <User className="w-3.5 h-3.5" />
                          <span>
                            Conta de {editUserRole === "administrador" ? "Administrador" : editUserRole === "instrutor" ? "Instrutor" : "Estudante"}
                          </span>
                        </div>

                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                          editUserStatus === "Bloqueado"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            editUserStatus === "Bloqueado" ? "bg-red-500 animate-pulse" : "bg-emerald-500 animate-pulse"
                          }`} />
                          {editUserStatus === "Bloqueado" ? "Bloqueado" : "Liberado"}
                        </span>
                      </div>

                      <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight truncate">
                          {editUserName || editingUser.name}
                        </h1>
                        <p className="text-sm sm:text-base font-semibold text-zinc-500 mt-0.5 truncate flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span>{editUserEmail || editingUser.email}</span>
                        </p>
                        {(editingUser.matricula || editingUser.id) && (
                          <p className="text-xs font-mono text-zinc-600 mt-1 bg-zinc-50 border border-zinc-200/80 px-2.5 py-1 rounded-lg inline-block">
                            Matrícula: <span className="font-black text-[#0b439c]">{userMat}</span>
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400">
                        Membro da plataforma de aprendizagem Programa Certo
                      </p>
                    </div>
                  </div>

                  {/* Painel de Progresso e Conquistas */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Painel de Progresso e Conquistas
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-200/70 rounded-2xl p-5 sm:p-6 transition-all shadow-2xs">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Total de Aulas Concluídas
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-[#0b439c] flex items-center justify-center">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-3xl sm:text-4xl font-black text-[#0b439c]">
                          {editingUserStats.loading ? "..." : editingUserStats.completedLessons}
                        </div>
                        <p className="text-xs text-zinc-500 font-medium mt-1">
                          Lições finalizadas com sucesso
                        </p>
                      </div>

                      <div className="bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-200/70 rounded-2xl p-5 sm:p-6 transition-all shadow-2xs">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Total de Cursos Concluídos
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-3xl sm:text-4xl font-black text-emerald-700">
                          {editingUserStats.loading ? "..." : editingUserStats.completedCourses}
                        </div>
                        <p className="text-xs text-zinc-500 font-medium mt-1">
                          Cursos com todas as aulas concluídas
                        </p>
                      </div>

                      <div className="bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-200/70 rounded-2xl p-5 sm:p-6 transition-all shadow-2xs">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Total de Trilhas Concluídas
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="text-3xl sm:text-4xl font-black text-amber-700">
                          {editingUserStats.loading ? "..." : editingUserStats.completedTrilhas}
                        </div>
                        <p className="text-xs text-zinc-500 font-medium mt-1">
                          Trilhas de estudo completadas
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Formulário de Edição Completa */}
                  <form onSubmit={handleSaveEditUser} className="pt-6 border-t border-zinc-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Dados do Usuário e Permissões
                      </h3>
                      {isEditingUserFields && (
                        <span className="text-[11px] font-bold text-[#0b439c] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                          Modo de Edição Ativo
                        </span>
                      )}
                    </div>

                    {editUserSuccessMsg && (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{editUserSuccessMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Nome Completo
                        </label>
                        {isEditingUserFields ? (
                          <input
                            type="text"
                            required
                            value={editUserName}
                            onChange={(e) => setEditUserName(e.target.value)}
                            placeholder="Ex: João da Silva"
                            className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                          />
                        ) : (
                          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 select-none cursor-default">
                            {editUserName || "Não informado"}
                          </div>
                        )}
                        <p className="text-[11px] text-zinc-400">
                          Nome exibido no perfil e nas interações da plataforma.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Endereço de E-mail
                        </label>
                        {isEditingUserFields ? (
                          <input
                            type="email"
                            required
                            value={editUserEmail}
                            onChange={(e) => setEditUserEmail(e.target.value)}
                            placeholder="Ex: joao.silva@exemplo.com"
                            className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                          />
                        ) : (
                          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-800 select-none cursor-default truncate">
                            {editUserEmail || "Não informado"}
                          </div>
                        )}
                        <p className="text-[11px] text-zinc-400">
                          Identificador de acesso associado à conta do usuário.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Nova Senha (Opcional)
                        </label>
                        {isEditingUserFields ? (
                          <div className="relative">
                            <input
                              type={showEditUserPassword ? "text" : "password"}
                              value={editUserPassword}
                              onChange={(e) => setEditUserPassword(e.target.value)}
                              placeholder="Deixe em branco para manter a atual"
                              className="w-full bg-white border-2 border-[#0b439c] rounded-xl pl-4 pr-11 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-all p-1 cursor-pointer"
                              title={showEditUserPassword ? "Ocultar senha" : "Ver senha"}
                            >
                              {showEditUserPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-400 select-none cursor-default tracking-widest font-mono">
                            ••••••••••••
                          </div>
                        )}
                        <p className="text-[11px] text-zinc-400">
                          {isEditingUserFields
                            ? "Deixe em branco para manter a senha atual."
                            : "Senha de acesso protegida por criptografia."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Cargo / Papel Institucional
                        </label>
                        {isEditingUserFields ? (
                          <select
                            value={editUserRole}
                            onChange={(e) => setEditUserRole(e.target.value as any)}
                            className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all cursor-pointer shadow-xs"
                          >
                            <option value="estudante">Estudante</option>
                            <option value="instrutor">Instrutor</option>
                            <option value="administrador">Administrador</option>
                          </select>
                        ) : (
                          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 select-none cursor-default">
                            {editUserRole === "administrador" ? "Administrador" : editUserRole === "instrutor" ? "Instrutor" : "Estudante"}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                          Acesso
                        </label>
                        {isEditingUserFields ? (
                          <select
                            value={editUserStatus}
                            onChange={(e) => setEditUserStatus(e.target.value as any)}
                            className="w-full bg-white border-2 border-[#0b439c] rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 focus:outline-none transition-all cursor-pointer shadow-xs"
                          >
                            <option value="Liberado">Liberado</option>
                            <option value="Bloqueado">Bloqueado</option>
                          </select>
                        ) : (
                          <div className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold text-zinc-900 select-none cursor-default">
                            {editUserStatus}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold uppercase tracking-wider block ${editUserStatus === "Bloqueado" ? "text-red-700" : "text-zinc-600"}`}>
                        Motivo {editUserStatus === "Bloqueado" ? "(Obrigatório para Bloqueado) *" : "(Caso o acesso seja marcado como Bloqueado)"}
                      </label>
                      {isEditingUserFields ? (
                        <textarea
                          required={editUserStatus === "Bloqueado"}
                          value={editUserMotivo}
                          onChange={(e) => setEditUserMotivo(e.target.value)}
                          placeholder="Informe a justificativa caso o acesso seja marcado como Bloqueado..."
                          rows={3}
                          className="w-full bg-white border-2 border-[#0b439c] rounded-xl p-4 text-sm font-medium text-zinc-900 focus:outline-none transition-all resize-none shadow-xs"
                        />
                      ) : (
                        <div className="w-full min-h-[84px] bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm font-medium text-zinc-700 select-none cursor-default whitespace-pre-wrap">
                          {editUserMotivo ? (
                            editUserMotivo
                          ) : (
                            <span className="text-zinc-400">Nenhum motivo de bloqueio registrado.</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botão Editar Dados (Logo abaixo do Motivo) */}
                    <div className="pt-1">
                      {!isEditingUserFields ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingUserFields(true);
                            setEditUserSuccessMsg(null);
                          }}
                          className="px-5 py-2.5 bg-[#0b439c] hover:bg-blue-800 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center gap-2 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Editar Dados</span>
                        </button>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditUserName(editingUser.name || editingUser.nome || "");
                              setEditUserEmail(editingUser.email || "");
                              setEditUserPassword("");
                              setShowEditUserPassword(false);
                              setEditUserRole(editingUser.account_type || "estudante");
                              const isBlocked = editingUser.acesso === "Bloqueado" || editingUser.status === "Bloqueado" || editingUser.status_da_conta === "Bloqueado";
                              setEditUserStatus(isBlocked ? "Bloqueado" : "Liberado");
                              setEditUserMotivo(editingUser.motivo || "");
                              setIsEditingUserFields(false);
                            }}
                            className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>

                          <button
                            type="submit"
                            className="px-6 py-2.5 bg-[#0b439c] hover:bg-blue-800 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center gap-2 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Salvar Alterações</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-50/80 rounded-2xl p-4 sm:p-5 border border-zinc-200/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0b439c] flex items-center justify-center shrink-0 shadow-2xs">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                            Data de Criação da Conta
                          </span>
                          <span className="text-sm font-extrabold text-zinc-900 font-mono">
                            {editingUser.created_at ? String(editingUser.created_at).split("T")[0] : "2026-07-23"}
                          </span>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-full border ${
                        editUserStatus === "Bloqueado"
                          ? "bg-red-50 border-red-200/60"
                          : "bg-emerald-50 border-emerald-200/60"
                      }`}>
                        <span className={`w-2 h-2 rounded-full inline-block animate-pulse ${
                          editUserStatus === "Bloqueado" ? "bg-red-500" : "bg-emerald-500"
                        }`} />
                        <span className={`text-xs font-bold ${
                          editUserStatus === "Bloqueado" ? "text-red-700" : "text-emerald-700"
                        }`}>
                          {editUserStatus === "Bloqueado" ? "Acesso Bloqueado" : "Conta Liberada"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 bg-zinc-50/80 rounded-2xl p-5 sm:p-6 border border-zinc-200/70">
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2 text-zinc-900 font-extrabold text-sm tracking-tight">
                          <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </div>
                          <span>Excluir Conta Permanentemente</span>
                        </div>
                        <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                          Ao solicitar a exclusão desta conta, todos os dados cadastrais, cursos concluídos e lições finalizadas deste usuário serão apagados. Esta ação não pode ser desfeita.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUserToDelete(editingUser);
                          setDeleteAdminPassword("");
                          setDeleteErrorMsg("");
                        }}
                        className="px-5 py-2.5 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-300 border border-red-200 text-red-600 font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir Conta Permanentemente</span>
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            );
          }

          const activeTicket = selectedTicketForDetail || tickets.find(t => 
            t.id.toLowerCase() === (viewingTicketDetailProtocol || "").toLowerCase() ||
            t.id.toLowerCase().replace("#", "") === (viewingTicketDetailProtocol || "").toLowerCase() ||
            t.id.toLowerCase().replace("atend-", "") === (viewingTicketDetailProtocol || "").toLowerCase()
          );

          // Se estiver visualizando detalhes do atendimento, exibe a tela dedicada e oculta toda a listagem anterior
          if (activeTicket) {
            return (
              <TicketDetailView
                ticket={activeTicket}
                onBack={() => {
                  setSelectedTicketForDetail(null);
                  setViewingTicketDetailProtocol(null);
                  if (typeof window !== "undefined") {
                    window.history.pushState({}, "", "/atendimento");
                  }
                  scrollToTop();
                }}
                onViewPdf={(t) => {
                  openTicketPdfInBrowser(t);
                }}
                onDownloadPdf={(t) => {
                  generateTicketPdf(t);
                }}
                isAdmin={true}
                adminName={studentName || "Equipe Programa Certo"}
                allUsers={allUsers}
                allTickets={tickets}
                onSaveResponse={handleSaveInlineResponse}
                onSelectOtherTicket={(otherTicket) => {
                  setSelectedTicketForDetail(otherTicket);
                  const cleanProto = otherTicket.id.replace(/^#/, "");
                  setViewingTicketDetailProtocol(cleanProto);
                  if (typeof window !== "undefined") {
                    window.history.pushState({}, "", `/atendimento-${cleanProto}`);
                  }
                  scrollToTop();
                }}
                onToggleUserBlock={handleToggleUserBlockFromTicket}
                onNavigateToUser={(targetUser) => {
                  if (targetUser && typeof targetUser === "object") {
                    const matched = allUsers.find(u =>
                      (targetUser.matricula && (u.matricula === targetUser.matricula || extractMatricula(u.matricula || u.id, allUsers) === extractMatricula(targetUser.matricula, allUsers))) ||
                      (targetUser.id && (u.id === targetUser.id || u.matricula === targetUser.id)) ||
                      (targetUser.email && u.email && u.email.toLowerCase() === targetUser.email.toLowerCase()) ||
                      (targetUser.name && (u.name || u.nome) && String(u.name || u.nome).toLowerCase() === String(targetUser.name).toLowerCase())
                    );
                    handleOpenEditUser(matched || targetUser, true);
                  } else if (typeof targetUser === "string") {
                    const matched = allUsers.find(u => matchesUserSearch(u, targetUser, allUsers));
                    if (matched) {
                      handleOpenEditUser(matched, true);
                    }
                  }
                }}
              />
            );
          }

          // Métricas
          const totalCount = tickets.length;
          const pendingCount = tickets.filter(t => t.status === "Aguardando" || t.status === "Pendente").length;
          const blockPendingCount = tickets.filter(t => t.tipo === "Bloqueio de Conta" && (t.status === "Aguardando" || t.status === "Pendente")).length;
          const inProgressCount = tickets.filter(t => t.status === "Em Andamento").length;
          const doneCount = tickets.filter(t => t.status === "Concluído").length;

          // Filtragem
          const filtered = tickets.filter((ticket) => {
            // Filtro por Categoria / Sub-página
            if (ticketCategoryFilter !== "Todos") {
              if (ticketCategoryFilter === "Bloqueio de Conta") {
                if (ticket.tipo !== "Bloqueio de Conta") return false;
                if (ticketBlockSubFilter === "bloqueados") {
                  if (ticket.status === "Concluído") return false;
                } else if (ticketBlockSubFilter === "liberados") {
                  if (ticket.status !== "Concluído") return false;
                }
              } else if (ticketCategoryFilter === "Dúvidas") {
                if (ticket.tipo !== "Dúvida") return false;
              } else if (ticketCategoryFilter === "Sugestões") {
                if (ticket.tipo !== "Sugestão") return false;
              } else if (ticketCategoryFilter === "Problemas Técnicos") {
                if (ticket.tipo !== "Problema Técnico") return false;
              } else if (ticketCategoryFilter === "Outros") {
                if (ticket.tipo === "Bloqueio de Conta" || ticket.tipo === "Dúvida" || ticket.tipo === "Sugestão" || ticket.tipo === "Problema Técnico") return false;
              }
            }

            // Filtro por Status
            if (ticketStatusFilter !== "Todos") {
              if (ticketStatusFilter === "Aguardando") {
                if (ticket.status !== "Aguardando" && ticket.status !== "Pendente") return false;
              } else if (ticket.status !== ticketStatusFilter) {
                return false;
              }
            }

            // Busca por texto (nome, email, Matrícula de 6 dígitos, protocolo ou mensagem)
            if (ticketSearchTerm.trim()) {
              const q = ticketSearchTerm.toLowerCase().trim();
              const qNoDot = q.replace(/^\./, "");
              const rawMatOrId = ticket.matricula_usuario || ticket.user_id || ticket.id_do_usuario || "";
              const mat6 = rawMatOrId ? extractMatricula(rawMatOrId, allUsers).toLowerCase() : "";

              const matchId = ticket.id.toLowerCase().includes(q);
              const matchName = (ticket.nome || "").toLowerCase().includes(q);
              const matchEmail = (ticket.email || "").toLowerCase().includes(q);
              const matchUserId = rawMatOrId.toLowerCase().includes(q) || (mat6 !== "" && mat6.includes(qNoDot));
              const matchMsg = ticket.mensagem.toLowerCase().includes(q);
              const matchType = ticket.tipo.toLowerCase().includes(q);
              const matchReply = (ticket.resposta || "").toLowerCase().includes(q);
              if (!matchId && !matchName && !matchEmail && !matchUserId && !matchMsg && !matchType && !matchReply) return false;
            }

            return true;
          });

          // Ordenação FIFO estrita permanente: mais antigos primeiro (quem abriu semana passada fica antes de ontem; 8h antes de 9h)
          const sortedTickets = [...filtered].sort((a, b) => {
            const timeA = new Date(a.criado_em).getTime() || 0;
            const timeB = new Date(b.criado_em).getTime() || 0;
            return timeA - timeB;
          });

          // Atendimentos filtrados para a caixinha "Imprimir Atendimentos"
          const ticketsForPrintReport = [...tickets]
            .filter((t) => {
              if (printPeriodMode === "days") {
                const daysNum = Math.max(1, parseInt(printDaysCount, 10) || 30);
                const cutoffMs = Date.now() - daysNum * 24 * 60 * 60 * 1000;
                const createdMs = new Date(t.criado_em).getTime() || 0;
                if (createdMs < cutoffMs) return false;
              }
              if (printUserMode === "specific") {
                if (printSelectedUser) {
                  const tMat = extractMatricula(t.matricula_usuario || t.user_id || t.id_do_usuario || "", allUsers).toLowerCase();
                  const selMat = extractMatricula(printSelectedUser.matricula || printSelectedUser.id || "", allUsers).toLowerCase();
                  const tEmail = String(t.email || "").trim().toLowerCase();
                  const selEmail = String(printSelectedUser.email || "").trim().toLowerCase();
                  const tName = String(t.nome || "").trim().toLowerCase();
                  const selName = String(printSelectedUser.name || printSelectedUser.nome || "").trim().toLowerCase();

                  if (selMat && tMat && selMat === tMat) return true;
                  if (selEmail && tEmail && selEmail === tEmail) return true;
                  if (selName && tName && selName === tName) return true;
                  return false;
                } else if (printUserSearchQuery.trim()) {
                  const q = printUserSearchQuery.toLowerCase().trim();
                  const qNoDot = q.replace(/^\./, "");
                  const rawMatOrId = t.matricula_usuario || t.user_id || t.id_do_usuario || "";
                  const mat6 = rawMatOrId ? extractMatricula(rawMatOrId, allUsers).toLowerCase() : "";
                  return (
                    (t.nome || "").toLowerCase().includes(q) ||
                    (t.email || "").toLowerCase().includes(q) ||
                    rawMatOrId.toLowerCase().includes(q) ||
                    (mat6 !== "" && mat6.includes(qNoDot))
                  );
                }
              }
              return true;
            })
            .sort((a, b) => (new Date(a.criado_em).getTime() || 0) - (new Date(b.criado_em).getTime() || 0));

          const matchingUsersForPrint = allUsers.filter((u) =>
            matchesUserSearch(u, printUserSearchQuery, allUsers)
          );

          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto space-y-6"
            >
              {/* Header Card: Somente informativo e botão de recarregar */}
              <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/70 text-[#0b439c] flex items-center justify-center shrink-0 shadow-inner">
                    <LifeBuoy className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                        Central de Atendimento
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100/70 text-blue-800 border border-blue-200">
                        Painel de Suporte e Fila de Chamados
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-xl">
                      Fila cronológica de atendimento. Visualize as solicitações dos usuários, consulte cadastros e envie respostas oficiais com conclusão automática.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
                  <button
                    onClick={() => loadTickets()}
                    disabled={ticketsLoading}
                    className="px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    title="Atualizar lista de chamados"
                  >
                    <RefreshCw className={`w-4 h-4 ${ticketsLoading ? "animate-spin text-blue-600" : ""}`} />
                    <span>Atualizar Lista</span>
                  </button>
                </div>
              </div>

              {/* Alerta de Sucesso */}
              {ticketSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-semibold flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{ticketSuccess}</span>
                  </div>
                  <button
                    onClick={() => setTicketSuccess(null)}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
                  >
                    Fechar
                  </button>
                </motion.div>
              )}

              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Registrados</p>
                  <p className="text-2xl font-black text-zinc-900 mt-1">{totalCount}</p>
                </div>

                <div className="bg-amber-50/60 p-4 sm:p-5 rounded-2xl border border-amber-200/70 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Aguardando</p>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-black text-amber-900 mt-1">{pendingCount}</p>
                </div>

                <div className="bg-red-50/60 p-4 sm:p-5 rounded-2xl border border-red-200/70 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Bloqueios de Conta</p>
                    <Lock className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-2xl font-black text-red-900">{blockPendingCount}</p>
                    {blockPendingCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white animate-pulse">
                        Urgente
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-emerald-50/60 p-4 sm:p-5 rounded-2xl border border-emerald-200/70 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Concluídos</p>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{doneCount}</p>
                </div>
              </div>

              {/* Caixinha Expansível: Imprimir Atendimentos (Logo abaixo dos cards de métricas) */}
              <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsPrintTicketsBoxOpen(!isPrintTicketsBoxOpen)}
                  className="w-full p-5 flex items-center justify-between gap-4 hover:bg-zinc-50/80 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/70 text-[#0b439c] flex items-center justify-center shrink-0">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-zinc-900">
                        Imprimir Atendimentos
                      </h3>
                      <p className="text-xs text-zinc-500">
                        Imprima, visualize em PDF ou baixe relatórios de todos os atendimentos, por período de dias ou por usuário específico.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3.5 py-2 rounded-xl bg-[#0b439c] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                      <Printer className="w-3.5 h-3.5" />
                      <span>{isPrintTicketsBoxOpen ? "Fechar Opções" : "Imprimir Atendimentos"}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isPrintTicketsBoxOpen ? "rotate-180" : ""}`} />
                    </span>
                  </div>
                </button>

                <AnimatePresence>
                  {isPrintTicketsBoxOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-zinc-100 p-5 sm:p-6 bg-zinc-50/50 space-y-6 overflow-hidden"
                    >
                      {/* 1. Seleção de Período */}
                      <div className="space-y-3">
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
                          1. Quais atendimentos deseja imprimir? (Período)
                        </label>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setPrintPeriodMode("all")}
                            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              printPeriodMode === "all"
                                ? "bg-[#0b439c] text-white border-[#0b439c] shadow-xs"
                                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                            }`}
                          >
                            Imprimir todos os atendimentos
                          </button>

                          {[
                            { label: "Últimos 10 dias", val: "10" },
                            { label: "Últimos 15 dias", val: "15" },
                            { label: "Últimos 30 dias", val: "30" }
                          ].map((preset) => (
                            <button
                              key={preset.val}
                              type="button"
                              onClick={() => {
                                setPrintPeriodMode("days");
                                setPrintDaysCount(preset.val);
                              }}
                              className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                printPeriodMode === "days" && printDaysCount === preset.val
                                  ? "bg-[#0b439c] text-white border-[#0b439c] shadow-xs"
                                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}

                          {/* Campo para digitar quantos dias atrás quiser */}
                          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-3 py-1.5 shadow-2xs">
                            <span className="text-xs font-semibold text-zinc-600">Últimos</span>
                            <input
                              type="number"
                              min={1}
                              max={3650}
                              value={printDaysCount}
                              onFocus={() => setPrintPeriodMode("days")}
                              onChange={(e) => {
                                setPrintPeriodMode("days");
                                setPrintDaysCount(e.target.value);
                              }}
                              className="w-16 text-center bg-zinc-50 border border-zinc-200 rounded-lg py-1 px-2 text-xs font-black text-zinc-900 focus:outline-none focus:border-[#0b439c]"
                            />
                            <span className="text-xs font-semibold text-zinc-600">dias atrás</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Seleção de Usuário (Caixinha "Todos" no topo + Busca por Nome, E-mail ou UID / 6 últimos números) */}
                      <div className="space-y-3 pt-4 border-t border-zinc-200/70">
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
                          2. Filtrar por Usuário (Todos ou Usuário Específico)
                        </label>

                        {/* Caixinha de cima escrita "Todos" */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPrintUserMode("all");
                              setPrintSelectedUser(null);
                              setPrintUserSearchQuery("");
                            }}
                            className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                              printUserMode === "all"
                                ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Todos (Todos os usuários)</span>
                          </button>

                          {printSelectedUser && (
                            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-xs font-bold text-[#0b439c]">
                              <User className="w-3.5 h-3.5" />
                              <span>Selecionado: {printSelectedUser.name || printSelectedUser.nome}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPrintSelectedUser(null);
                                  setPrintUserMode("all");
                                  setPrintUserSearchQuery("");
                                }}
                                className="ml-1 text-blue-700 hover:text-blue-950 cursor-pointer"
                                title="Remover filtro de usuário"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Campo para digitar o nome, e-mail ou ID do usuário */}
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={printUserSearchQuery}
                              onFocus={() => {
                                if (printUserSearchQuery.trim()) setPrintUserMode("specific");
                              }}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPrintUserSearchQuery(val);
                                if (val.trim()) {
                                  setPrintUserMode("specific");
                                  setPrintSelectedUser(null);
                                } else {
                                  setPrintUserMode("all");
                                  setPrintSelectedUser(null);
                                }
                              }}
                              placeholder="Digite o nome, e-mail ou a Matrícula do usuário (6 números)..."
                              className="w-full pl-10 pr-9 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#0b439c] shadow-2xs"
                            />
                            {printUserSearchQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPrintUserSearchQuery("");
                                  setPrintSelectedUser(null);
                                  setPrintUserMode("all");
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Lista de Usuários que aparece embaixo ao digitar (com a caixinha "Todos" no topo) */}
                          {printUserSearchQuery.trim() !== "" && (
                            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm max-h-52 overflow-y-auto divide-y divide-zinc-100">
                              <button
                                type="button"
                                onClick={() => {
                                  setPrintUserMode("all");
                                  setPrintSelectedUser(null);
                                  setPrintUserSearchQuery("");
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-zinc-800 hover:bg-blue-50/60 flex items-center justify-between cursor-pointer bg-zinc-50/70"
                              >
                                <span>Todos (Imprimir de todos os usuários)</span>
                                <span className="text-[10px] font-mono text-zinc-500">Todos</span>
                              </button>

                              {matchingUsersForPrint.length === 0 ? (
                                <div className="px-4 py-3 text-xs text-zinc-400 italic">
                                  Nenhum usuário encontrado com "{printUserSearchQuery}".
                                </div>
                              ) : (
                                matchingUsersForPrint.map((uItem) => {
                                  const uMat = extractMatricula(uItem.matricula || uItem.id, allUsers);
                                  const isSelected = printSelectedUser?.id === uItem.id;
                                  return (
                                    <button
                                      key={uItem.id}
                                      type="button"
                                      onClick={() => {
                                        setPrintSelectedUser(uItem);
                                        setPrintUserMode("specific");
                                        setPrintUserSearchQuery(uItem.name || uItem.nome || "");
                                      }}
                                      className={`w-full px-4 py-2.5 text-left text-xs hover:bg-blue-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-1 cursor-pointer ${
                                        isSelected ? "bg-blue-50 font-bold" : ""
                                      }`}
                                    >
                                      <div>
                                        <span className="font-bold text-zinc-900">{uItem.name || uItem.nome}</span>
                                        <span className="text-zinc-500 ml-2 font-mono">{uItem.email}</span>
                                      </div>
                                      <span className="font-mono text-[11px] text-zinc-500">
                                        Matrícula: <strong className="text-[#0b439c]">{uMat}</strong>
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. Resumo e Botões: Imprimir, Visualizar em PDF e Baixar em PDF */}
                      <div className="pt-4 border-t border-zinc-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="text-xs text-zinc-600 font-medium">
                          <span className="font-black text-zinc-900">{ticketsForPrintReport.length}</span> atendimento(s) encontrado(s) para o filtro selecionado.
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-end">
                          {/* Botão Imprimir */}
                          <button
                            type="button"
                            disabled={ticketsForPrintReport.length === 0}
                            onClick={() =>
                              printTicketsInBrowser(
                                ticketsForPrintReport,
                                studentName || "Equipe Programa Certo",
                                allUsers
                              )
                            }
                            className="px-4 py-2.5 bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-800 border border-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                          >
                            <Printer className="w-4 h-4 text-zinc-700" />
                            <span>Imprimir</span>
                          </button>

                          {/* Botão Visualizar em PDF (Abre em outra página sem bloqueio de conta Google AI Studio) */}
                          <button
                            type="button"
                            disabled={ticketsForPrintReport.length === 0}
                            onClick={() =>
                              openMultipleTicketsPdfInBrowser(
                                ticketsForPrintReport,
                                allUsers,
                                studentName || "Equipe Programa Certo"
                              )
                            }
                            className="px-4 py-2.5 bg-[#0b439c] hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Visualizar em PDF</span>
                            <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
                          </button>

                          {/* Botão Baixar em PDF */}
                          <button
                            type="button"
                            disabled={ticketsForPrintReport.length === 0}
                            onClick={() =>
                              generateMultipleTicketsPdf(
                                ticketsForPrintReport,
                                printPeriodMode === "all" ? "Todos" : `Ultimos-${printDaysCount}-dias`,
                                allUsers,
                                studentName || "Equipe Programa Certo"
                              )
                            }
                            className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                          >
                            <Download className="w-4 h-4" />
                            <span>Baixar em PDF</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Barra de Filtros Empilhados (Um embaixo do outro, sem rolagem para o lado) */}
              <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-2xs space-y-4">
                {/* Linha 1: Campo de Busca Completo (Nome, Email, Matrícula, Protocolo) */}
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={ticketSearchTerm}
                    onChange={(e) => setTicketSearchTerm(e.target.value)}
                    placeholder="Pesquisar por nome do usuário, e-mail, Matrícula ou protocolo..."
                    className="w-full pl-10 pr-9 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-2xs"
                  />
                  {ticketSearchTerm && (
                    <button
                      onClick={() => setTicketSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                      title="Limpar busca"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Linha 2: Tipo de Solicitação (Dispostos com flex-wrap sem precisar rolar para o lado) */}
                <div className="pt-2 border-t border-zinc-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    <Tag className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Tipo:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: "Todos", label: "Todos os Tipos", count: tickets.length },
                      { 
                        id: "Bloqueio de Conta", 
                        label: "Bloqueio de Conta", 
                        count: tickets.filter(t => t.tipo === "Bloqueio de Conta").length,
                        alert: tickets.filter(t => t.tipo === "Bloqueio de Conta" && t.status !== "Concluído").length > 0
                      },
                      { id: "Dúvidas", label: "Dúvidas", count: tickets.filter(t => t.tipo === "Dúvida").length },
                      { id: "Sugestões", label: "Sugestões", count: tickets.filter(t => t.tipo === "Sugestão").length },
                      { id: "Problemas Técnicos", label: "Problema Técnico", count: tickets.filter(t => t.tipo === "Problema Técnico").length },
                      { 
                        id: "Outros", 
                        label: "Outros", 
                        count: tickets.filter(t => t.tipo !== "Bloqueio de Conta" && t.tipo !== "Dúvida" && t.tipo !== "Sugestão" && t.tipo !== "Problema Técnico").length 
                      },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setTicketCategoryFilter(cat.id);
                          if (cat.id === "Bloqueio de Conta") {
                            setTicketBlockSubFilter("todos_bloqueios");
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          ticketCategoryFilter === cat.id
                            ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                          ticketCategoryFilter === cat.id
                            ? "bg-white/20 text-white"
                            : "bg-zinc-100 text-zinc-600"
                        }`}>
                          {cat.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Linha 3: Sub-filtro de Bloqueio de Conta (SOMENTE APARECE QUANDO O TIPO FOR "Bloqueio de Conta") */}
                {ticketCategoryFilter === "Bloqueio de Conta" && (
                  <div className="pt-2 border-t border-zinc-100 space-y-2">
                    <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                      <Lock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Situação da conta:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { 
                          id: "todos_bloqueios", 
                          label: "Todos", 
                          count: tickets.filter(t => t.tipo === "Bloqueio de Conta").length 
                        },
                        { 
                          id: "bloqueados", 
                          label: "Conta bloqueada", 
                          count: tickets.filter(t => t.tipo === "Bloqueio de Conta" && t.status !== "Concluído").length
                        },
                        { 
                          id: "liberados", 
                          label: "Conta com acesso liberado", 
                          count: tickets.filter(t => t.tipo === "Bloqueio de Conta" && t.status === "Concluído").length
                        }
                      ].map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setTicketBlockSubFilter(sub.id as any)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            ticketBlockSubFilter === sub.id
                              ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                              : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                          }`}
                        >
                          <span>{sub.label}</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                            ticketBlockSubFilter === sub.id
                              ? "bg-white/20 text-white font-bold"
                              : "bg-zinc-100 text-zinc-600"
                          }`}>
                            {sub.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linha 4: Status do Atendimento (Sem exibindo X de Y) */}
                <div className="pt-2 border-t border-zinc-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    <Filter className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Status:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    {(["Todos", "Aguardando", "Em Andamento", "Concluído"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setTicketStatusFilter(st)}
                        className={`px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                          ticketStatusFilter === st
                            ? "bg-[#0b439c] text-white border-[#0b439c] shadow-xs"
                            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista dos Chamados */}
              {ticketsLoading && tickets.length === 0 ? (
                <div className="bg-white rounded-3xl border border-zinc-200/80 p-12 text-center space-y-3 shadow-2xs">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-bold text-zinc-600">Carregando fila de atendimentos...</p>
                </div>
              ) : sortedTickets.length === 0 ? (
                <div className="bg-white rounded-3xl border border-zinc-200/80 p-10 sm:p-14 text-center space-y-4 shadow-2xs">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="font-bold text-zinc-900 text-lg">Nenhum atendimento na fila</h3>
                    <p className="text-xs sm:text-sm text-zinc-500">
                      {ticketSearchTerm || ticketStatusFilter !== "Todos" || ticketCategoryFilter !== "Todos"
                        ? "Nenhum chamado corresponde aos filtros aplicados. Tente ajustar os termos de busca ou limpar os filtros."
                        : "Não há atendimentos registrados no sistema no momento."}
                    </p>
                  </div>
                  {(ticketSearchTerm || ticketStatusFilter !== "Todos" || ticketCategoryFilter !== "Todos") && (
                    <div className="pt-2 flex items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setTicketSearchTerm("");
                          setTicketStatusFilter("Todos");
                          setTicketCategoryFilter("Todos");
                        }}
                        className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Limpar Todos os Filtros
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedTickets.map((item, idx) => {
                    let typeBadgeStyle = "bg-zinc-100 text-zinc-700 border-zinc-200";
                    if (item.tipo === "Sugestão") typeBadgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
                    else if (item.tipo === "Dúvida") typeBadgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                    else if (item.tipo === "Bloqueio de Conta") typeBadgeStyle = "bg-zinc-100 text-zinc-800 border-zinc-300 font-bold";
                    else if (item.tipo === "Problema Técnico") typeBadgeStyle = "bg-orange-50 text-orange-700 border-orange-200";
                    else if (item.tipo === "Reclamação") typeBadgeStyle = "bg-amber-50 text-amber-800 border-amber-200";

                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Aguardando
                      </span>
                    );
                    if (item.status === "Em Andamento") {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                          Em Andamento
                        </span>
                      );
                    } else if (item.status === "Concluído") {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Concluído
                        </span>
                      );
                    }

                    const dateFormatted = new Date(item.criado_em).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedTicketForDetail(item);
                          const cleanProto = item.id.replace(/^#/, "");
                          setViewingTicketDetailProtocol(cleanProto);
                          if (typeof window !== "undefined") {
                            window.history.pushState({}, "", `/atendimento-${cleanProto}`);
                          }
                          scrollToTop();
                        }}
                        className="bg-white rounded-2xl border border-zinc-200/80 hover:border-blue-300 transition-all p-4 sm:p-5 shadow-2xs hover:shadow-md cursor-pointer space-y-3"
                      >
                        {/* Linha Superior: Ordem na fila, Tipo, Protocolo, Data Aberto em, Status */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-700 font-mono font-bold text-[11px] flex items-center justify-center border border-zinc-200/80">
                              #{idx + 1}
                            </span>
                            <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${typeBadgeStyle}`}>
                              {item.tipo}
                            </span>
                            <span className="font-mono text-xs font-bold text-zinc-700 bg-zinc-100/90 px-2.5 py-0.5 rounded-lg border border-zinc-200/70">
                              #{item.id}
                            </span>
                            <span className="text-xs text-zinc-400 font-medium">
                              • Aberto em {dateFormatted}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                            {statusBadge}
                          </div>
                        </div>

                        {/* Dados do Solicitante: Nome, E-mail, Matrícula e Botão Ver Atendimento */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-4 text-xs bg-zinc-50/70 px-3.5 py-2.5 rounded-xl border border-zinc-150 flex-wrap flex-1">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="font-bold text-zinc-900">{item.nome || "Não informado"}</span>
                            </div>
                            {item.email && (
                              <div className="flex items-center gap-1.5 text-zinc-600">
                                <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span className="font-mono">{item.email}</span>
                              </div>
                            )}
                            {(item.matricula_usuario || item.user_id || item.id_do_usuario) && (
                              <div className="flex items-center gap-1.5 text-zinc-600 font-mono">
                                <span className="text-[10px] font-bold uppercase text-zinc-400">Matrícula:</span>
                                <span className="font-black text-[#0b439c]">
                                  {extractMatricula(item.matricula_usuario || item.user_id || item.id_do_usuario || "", allUsers)}
                                </span>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicketForDetail(item);
                              const cleanProto = item.id.replace(/^#/, "");
                              setViewingTicketDetailProtocol(cleanProto);
                              if (typeof window !== "undefined") {
                                window.history.pushState({}, "", `/atendimento-${cleanProto}`);
                              }
                              scrollToTop();
                            }}
                            className="px-4 py-2 bg-[#0b439c] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0 self-end sm:self-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Atendimento</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })()}

        {activeTab === "documentos" && (
          <DocumentosManager allUsers={allUsers} currentAdminName={studentName} currentUserId={user?.user_metadata?.matricula || user?.id} />
        )}

        {activeTab === "ocorrencias" && (
          <OcorrenciasManager allUsers={allUsers} currentAdminName={studentName} currentUserId={user?.user_metadata?.matricula || user?.id} />
        )}

      </main>

          {/* Rodapé no final da página (aparece somente ao rolar até o fim da página) */}
          <footer className="bg-white border-t border-zinc-200 mt-16 py-8 text-xs text-zinc-500 shrink-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
              <p className="font-semibold text-zinc-700">Programa Certo © 2026 — Seu ecossistema prático de aprendizado tecnológico.</p>
              <p className="text-zinc-400">Desenvolvido com carinho para inspirar carreiras e criar oportunidades.</p>
            </div>
          </footer>
        </div>
      </div>

      {/* ==================== CAMADAS DE ALTA PRIORIDADE (OVERLAYS ISOLADOS) ==================== */}

      {/* Camada: Aba Lateral Mobile (Prioridade absoluta quando aberta) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-[200] md:hidden overscroll-contain pointer-events-auto"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Fundo bloqueador da camada (Não deixa clicar nem rolar a página de trás) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              className="fixed top-0 left-0 bottom-0 w-[290px] sm:w-[320px] bg-white z-10 shadow-2xl flex flex-col border-r border-zinc-200 overscroll-contain"
            >
              <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
                <div className="flex items-center gap-2.5 select-none cursor-default">
                  <div className="w-9 h-9 rounded-lg bg-[#0b439c] flex items-center justify-center overflow-hidden shadow-sm">
                    <img
                      src="https://0.gravatar.com/userimage/283287275/316ae787b636086c7dcfa0d8c9ef6b77?size=256"
                      alt="Logo Programa Certo"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display font-black text-base text-[#0b439c] leading-none">
                      Programa Certo
                    </span>
                    <span className="font-display font-semibold text-[11px] text-zinc-500 leading-none mt-0.5">
                      Painel Administrativo
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 transition-colors cursor-pointer"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 mx-4 mt-4 bg-blue-50/80 border border-blue-100 rounded-2xl flex items-center gap-3 select-none cursor-default shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#0b439c] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                  {studentName.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "AD"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-zinc-900 text-sm truncate" title={studentName}>
                    {studentName}
                  </p>
                  <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-200/70 text-[#0b439c] mt-0.5">
                    Administrador
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-1.5 flex-1 overflow-y-auto overscroll-contain">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-3 mb-2 select-none">
                  Gestão e Administração
                </p>

                <button
                  type="button"
                  onClick={() => {
                    navigateToTab("dashboard");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                    activeTab === "dashboard"
                      ? "bg-[#0b439c] text-white shadow-md shadow-blue-900/10"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <Compass className="w-5 h-5" />
                  DASHBOARD
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigateToTab("usuarios");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                    activeTab === "usuarios"
                      ? "bg-[#0b439c] text-white shadow-md shadow-blue-900/10"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <Users className="w-5 h-5" />
                  USUÁRIOS
                </button>


                <button
                  type="button"
                  onClick={() => {
                    navigateToTab("atendimento");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                    activeTab === "atendimento" ? "bg-[#0b439c] text-white shadow-md shadow-blue-900/10" : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <LifeBuoy className="w-5 h-5" />
                  CENTRAL DE ATENDIMENTO
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigateToTab("documentos");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                    activeTab === "documentos" ? "bg-[#0b439c] text-white shadow-md shadow-blue-900/10" : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  DOCUMENTOS
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigateToTab("ocorrencias");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-sm transition-all text-left cursor-pointer ${
                    activeTab === "ocorrencias" ? "bg-[#0b439c] text-white shadow-md shadow-blue-900/10" : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  OCORRÊNCIAS
                </button>

                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-3 mt-5 mb-2 select-none">
                  Minha Conta
                </p>

                <button
                  type="button"
                  onClick={() => {
                    navigateToTab("perfil");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all text-left cursor-pointer ${
                    activeTab === "perfil" ? "bg-[#0b439c] text-white" : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <User className={`w-5 h-5 ${activeTab === "perfil" ? "text-white" : "text-zinc-500"}`} />
                  Meu Perfil
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigateToTab("termos");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all text-left cursor-pointer ${
                    activeTab === "termos" ? "bg-[#0b439c] text-white" : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <FileText className={`w-5 h-5 ${activeTab === "termos" ? "text-white" : "text-zinc-500"}`} />
                  Termo de Uso e Privacidade
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsMobileMenuOpen(false);
                    await handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all text-left cursor-pointer text-zinc-700 hover:bg-zinc-100 hover:text-red-600"
                >
                  <LogOut className="w-5 h-5 text-zinc-500" />
                  Sair da Conta
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Camada: Modal Criar Novo Usuário */}
      {isCreateUserModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="font-display font-black text-lg text-zinc-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#0b439c]" />
                Cadastrar Novo Usuário
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Endereço de E-mail
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Ex: joao.silva@exemplo.com"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    type={showNewUserPassword ? "text" : "password"}
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-1"
                    title={showNewUserPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showNewUserPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Cargo / Papel Institucional
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-800 focus:outline-none cursor-pointer"
                >
                  <option value="estudante">Estudante</option>
                  <option value="instrutor">Instrutor</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Acesso à Plataforma
                </label>
                <select
                  value={newUserStatus}
                  onChange={(e) => setNewUserStatus(e.target.value as any)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-800 focus:outline-none cursor-pointer"
                >
                  <option value="Liberado">Liberado</option>
                  <option value="Bloqueado">Bloqueado</option>
                </select>
              </div>

              {newUserStatus === "Bloqueado" && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="text-xs font-bold text-red-700 uppercase tracking-wider block">
                    Motivo do Bloqueio *
                  </label>
                  <textarea
                    required
                    value={newUserMotivo}
                    onChange={(e) => setNewUserMotivo(e.target.value)}
                    placeholder="Informe o motivo pelo qual este usuário está bloqueado..."
                    rows={3}
                    className="w-full bg-red-50/50 border border-red-200 rounded-xl p-3 text-xs font-medium text-zinc-900 focus:outline-none focus:border-red-500 focus:bg-white transition-all resize-none"
                  />
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Camada: Modal de Confirmação de Exclusão Definitiva de Usuário */}
      {userToDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-red-200 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="font-display font-black text-lg text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Excluir Conta e Dados
              </h3>
              <button
                type="button"
                onClick={() => {
                  setUserToDelete(null);
                  setDeleteAdminPassword("");
                  setDeleteErrorMsg("");
                }}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-red-900 text-xs leading-relaxed">
              <p className="font-bold text-sm text-red-800">
                Você tem certeza que deseja apagar a conta de "{userToDelete.name}" ({userToDelete.email})?
              </p>
              <p>
                Ao apagar esta conta, <strong>todos os dados dessa pessoa serão excluídos permanentemente</strong> (aulas concluídas, projetos enviados e acessos ao sistema). Esta ação não pode ser desfeita.
              </p>
            </div>

            <form onSubmit={handleConfirmDeleteUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                  Digite sua senha de Administrador para confirmar
                </label>
                <div className="relative">
                  <input
                    type={showDeleteAdminPassword ? "text" : "password"}
                    required
                    value={deleteAdminPassword}
                    onChange={(e) => {
                      setDeleteAdminPassword(e.target.value);
                      setDeleteErrorMsg("");
                    }}
                    placeholder="Sua senha de login"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-red-600 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeleteAdminPassword(!showDeleteAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-1"
                  >
                    {showDeleteAdminPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {deleteErrorMsg && (
                <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {deleteErrorMsg}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setUserToDelete(null);
                    setDeleteAdminPassword("");
                    setDeleteErrorMsg("");
                  }}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDeletingUser}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeletingUser ? "Excluindo..." : "Confirmar e Apagar Todos os Dados"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Camada: Modal Criar Novo Curso */}
      {isCreateCourseModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="font-display font-black text-lg text-zinc-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#0b439c]" />
                Cadastrar Novo Curso
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateCourseModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminCreateCourse} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Nome do Curso
                </label>
                <input
                  type="text"
                  required
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="Ex: Formação Completa em Front-End"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  required
                  value={newCourseDescription}
                  onChange={(e) => setNewCourseDescription(e.target.value)}
                  placeholder="Descreva o objetivo do curso e os temas abordados..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                    Categoria
                  </label>
                  <input
                    type="text"
                    required
                    value={newCourseCategory}
                    onChange={(e) => setNewCourseCategory(e.target.value)}
                    placeholder="Ex: Front-end, Back-end, Mobile"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                    Aulas
                  </label>
                  <input
                    type="text"
                    required
                    value={newCourseLessons}
                    onChange={(e) => setNewCourseLessons(e.target.value)}
                    placeholder="Ex: 10 aulas ou 10"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Instrutor
                </label>
                <input
                  type="text"
                  required
                  value={newCourseInstructor}
                  onChange={(e) => setNewCourseInstructor(e.target.value)}
                  placeholder="Ex: Dr. Carlos Oliveira"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                    Cor do Gradiente
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Formato: #HEX1, #HEX2
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    value={newCourseGradientColor}
                    onChange={(e) => setNewCourseGradientColor(e.target.value)}
                    placeholder="#ADD8E6, #000084"
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                  <div 
                    className="w-10 h-10 rounded-xl border border-zinc-300 shadow-xs shrink-0"
                    style={{
                      background: newCourseGradientColor.includes(',')
                        ? `linear-gradient(135deg, ${newCourseGradientColor.split(',')[0].trim()}, ${newCourseGradientColor.split(',')[1].trim()})`
                        : newCourseGradientColor
                    }}
                    title="Pré-visualização do Gradiente"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Visibilidade
                </label>
                <select
                  value={newCourseVisibility}
                  onChange={(e) => setNewCourseVisibility(e.target.value as any)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-800 focus:outline-none cursor-pointer"
                >
                  <option value="Público">Público</option>
                  <option value="Privado">Privado</option>
                  <option value="Rascunho">Rascunho</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateCourseModalOpen(false)}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  Cadastrar Curso
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal: Todos os Cursos (Com abas por Categoria/Status) */}
      <AnimatePresence>
        {showAllCoursesModal && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowAllCoursesModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-3xl w-full border border-zinc-200 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-[#0b439c] to-blue-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-blue-200" />
                  <div>
                    <h3 className="font-display font-extrabold text-lg tracking-tight">
                      Grade de Cursos
                    </h3>
                    <p className="text-xs text-blue-100">
                      Explore nossa grade de formações, conteúdos em andamento e concluídos.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAllCoursesModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Category & Status Filter Tabs Bar */}
              <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setCourseModalFilter("todos")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      courseModalFilter === "todos"
                        ? "bg-[#0b439c] text-white shadow-2xs"
                        : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                    }`}
                  >
                    <span>Todos os Cursos</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      courseModalFilter === "todos" ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {courses.filter((c) => getCourseProgress(c) > 0).length || courses.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setCourseModalFilter("em_andamento")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      courseModalFilter === "em_andamento"
                        ? "bg-[#0b439c] text-white shadow-2xs"
                        : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                    }`}
                  >
                    <span>Em Andamento</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      courseModalFilter === "em_andamento" ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {courses.filter((c) => { const p = getCourseProgress(c); return p > 0 && p < 100; }).length}
                    </span>
                  </button>

                  <button
                    onClick={() => setCourseModalFilter("concluidos")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      courseModalFilter === "concluidos"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-white text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${courseModalFilter === "concluidos" ? "text-white" : "text-emerald-600"}`} />
                    <span>Concluídos</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      courseModalFilter === "concluidos" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {courses.filter((c) => getCourseProgress(c) === 100).length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {(() => {
                  const activeUserCourses = courses.filter((c) => getCourseProgress(c) > 0);
                  const coursesToConsider = activeUserCourses.length > 0 ? activeUserCourses : courses;

                  const filteredCourses = coursesToConsider.filter((c) => {
                    const prog = getCourseProgress(c);
                    if (courseModalFilter === "em_andamento") return prog > 0 && prog < 100;
                    if (courseModalFilter === "concluidos") return prog === 100;
                    return true;
                  });

                  if (filteredCourses.length === 0) {
                    return (
                      <div className="py-12 text-center space-y-2 border border-dashed border-zinc-200 rounded-xl">
                        <BookOpen className="w-12 h-12 text-zinc-300 mx-auto" />
                        <h4 className="font-display font-bold text-base text-zinc-700">
                          {courseModalFilter === "concluidos"
                            ? "Nenhum curso concluído (100%) até o momento."
                            : courseModalFilter === "em_andamento"
                            ? "Nenhum curso em andamento."
                            : "Nenhum curso iniciado ou concluído."}
                        </h4>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredCourses.map((course) => {
                        const prog = getCourseProgress(course);
                        const isDone = prog === 100;

                        return (
                          <div
                            key={course.id}
                            className="bg-white border border-zinc-200 rounded-xl p-4 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between gap-3"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                  {course.category}
                                </span>
                                {isDone && (
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Concluído
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-zinc-900 text-sm line-clamp-1">{course.title}</h4>
                              <p className="text-xs text-zinc-500 line-clamp-2">{course.description}</p>
                            </div>

                            <div className="pt-2 border-t border-zinc-100 space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-zinc-500 font-semibold">
                                <span>Progresso</span>
                                <span className="text-[#0b439c] font-bold">{prog}%</span>
                              </div>
                              <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-[#0b439c] h-full rounded-full transition-all"
                                  style={{ width: `${prog}%` }}
                                />
                              </div>
                              <button
                                onClick={() => {
                                  setShowAllCoursesModal(false);
                                  handleContinueCourse(course);
                                }}
                                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 mt-1"
                              >
                                <span>{isDone ? "Ver Curso Concluído" : prog > 0 ? "Continuar Curso" : "Iniciar Curso"}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex justify-end shrink-0">
                <button
                  onClick={() => setShowAllCoursesModal(false)}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Supabase Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-zinc-900">
                    Acesso Administrativo
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Entre com sua conta de Administrador para gerenciar o sistema.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsAuthModalOpen(false);
                    setAuthError(null);
                  }}
                  className="p-1.5 rounded-full hover:bg-zinc-200 text-zinc-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
                {authError && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs shadow-xs space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-semibold">{authError}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                    Endereço de E-mail
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => {
                      setAuthEmail(e.target.value);
                      if (authError) setAuthError(null);
                      if (loginEmailNotRegistered) setLoginEmailNotRegistered(false);
                    }}
                    placeholder="admin@exemplo.com"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                    Senha de Acesso
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => {
                      setAuthPassword(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="Mínimo de 6 caracteres"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 px-4 bg-[#0b439c] hover:bg-blue-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-900/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {authLoading ? (
                    <div className="w-5 h-5 border-2 border-zinc-300 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Entrar"
                  )}
                </button>
              </form>

              {/* Informação do Painel */}
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 text-center text-xs text-zinc-500 font-medium">
                Acesso exclusivo para administradores e instrutores do Programa Certo.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Termos de Uso (Popup com Aceite para Cadastro e Consulta Rápida) */}
      {renderTermsModal()}

      {courseToDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-red-100 space-y-5 overscroll-contain"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-zinc-900">
                    Confirmar Exclusão de Curso
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    Ação irreversível de segurança
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCourseToDelete(null);
                  setDeleteCoursePassword("");
                  setDeleteCourseErrorMsg("");
                }}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-red-900">
                Atenção: Você está prestes a excluir o curso <span className="underline font-black">"{courseToDelete.title}"</span>.
              </p>
              <p className="text-xs text-red-700 leading-relaxed">
                Ao confirmar, o curso e todos os seus dados vinculados (módulos, aulas, notas de alunos e progresso) serão <strong>excluídos permanentemente</strong> do banco de dados.
              </p>
            </div>

            <form onSubmit={handleConfirmDeleteCourse} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                  Sua Senha de Acesso para Confirmar
                </label>
                <div className="relative">
                  <input
                    type={showDeleteCoursePassword ? "text" : "password"}
                    required
                    value={deleteCoursePassword}
                    onChange={(e) => {
                      setDeleteCoursePassword(e.target.value);
                      setDeleteCourseErrorMsg("");
                    }}
                    placeholder="Digite sua senha de login"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-red-600 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeleteCoursePassword(!showDeleteCoursePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showDeleteCoursePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {deleteCourseErrorMsg && (
                <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {deleteCourseErrorMsg}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setCourseToDelete(null);
                    setDeleteCoursePassword("");
                    setDeleteCourseErrorMsg("");
                  }}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDeletingCourse || !deleteCoursePassword.trim()}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeletingCourse ? "Excluindo..." : "Confirmar e Excluir Curso"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal de Editar Curso */}
      {editingCourse && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="font-display font-black text-lg text-zinc-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#0b439c]" />
                Editar Informações do Curso
              </h3>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCourse} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Nome do Curso
                </label>
                <input
                  type="text"
                  required
                  value={editCourseTitle}
                  onChange={(e) => setEditCourseTitle(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Descrição
                </label>
                <textarea
                  rows={3}
                  required
                  value={editCourseDescription}
                  onChange={(e) => setEditCourseDescription(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                    Categoria
                  </label>
                  <input
                    type="text"
                    required
                    value={editCourseCategory}
                    onChange={(e) => setEditCourseCategory(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                    Instrutor
                  </label>
                  <input
                    type="text"
                    required
                    value={editCourseInstructor}
                    onChange={(e) => setEditCourseInstructor(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Cor do Gradiente
                </label>
                <input
                  type="text"
                  required
                  value={editCourseGradientColor}
                  onChange={(e) => setEditCourseGradientColor(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-mono font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Visibilidade
                </label>
                <select
                  value={editCourseVisibility}
                  onChange={(e) => setEditCourseVisibility(e.target.value as any)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-800 focus:outline-none cursor-pointer"
                >
                  <option value="Público">Público</option>
                  <option value="Privado">Privado</option>
                  <option value="Rascunho">Rascunho</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal de Adicionar Módulo ou Aula */}
      {moduleLessonCourse && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="font-display font-black text-lg text-zinc-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#0b439c]" />
                  Adicionar Conteúdo ao Curso
                </h3>
                <p className="text-xs text-zinc-500 font-medium">
                  Curso: {moduleLessonCourse.title}
                </p>
              </div>
              <button
                onClick={() => setModuleLessonCourse(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-zinc-200 gap-4">
              <button
                type="button"
                onClick={() => setAddType("module")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  addType === "module"
                    ? "border-b-2 border-[#0b439c] text-[#0b439c]"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                + Novo Módulo
              </button>
              <button
                type="button"
                onClick={() => setAddType("lesson")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  addType === "lesson"
                    ? "border-b-2 border-[#0b439c] text-[#0b439c]"
                    : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                + Nova Aula de Texto
              </button>
            </div>

            <form onSubmit={handleAddModuleOrLesson} className="space-y-4">
              {addType === "module" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                    Título do Novo Módulo
                  </label>
                  <input
                    type="text"
                    required
                    value={addModuleTitle}
                    onChange={(e) => setAddModuleTitle(e.target.value)}
                    placeholder="Ex: Módulo 2: Estruturas Avançadas"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                      Módulo de Destino
                    </label>
                    <select
                      value={selectedTargetModuleIndex}
                      onChange={(e) => setSelectedTargetModuleIndex(Number(e.target.value))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-800 focus:outline-none cursor-pointer"
                    >
                      {moduleLessonCourse.modules?.map((m, idx) => (
                        <option key={idx} value={idx}>
                          Módulo {idx + 1}: {m.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                      Título da Aula
                    </label>
                    <input
                      type="text"
                      required
                      value={addLessonTitle}
                      onChange={(e) => setAddLessonTitle(e.target.value)}
                      placeholder="Ex: Aula 1: Conceitos Iniciais"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                      Conteúdo Escrito da Aula (Markdown)
                    </label>
                    <textarea
                      rows={5}
                      value={addLessonContent}
                      onChange={(e) => setAddLessonContent(e.target.value)}
                      placeholder="# Título da Aula&#10;&#10;Escreva aqui o texto explicativo da aula..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-sm font-mono text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setModuleLessonCourse(null)}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  Salvar Conteúdo
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal de Editar Aula */}
      {editingLesson && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="font-display font-black text-lg text-zinc-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#0b439c]" />
                Editar Conteúdo da Aula
              </h3>
              <button
                onClick={() => setEditingLesson(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLesson} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Título da Aula
                </label>
                <input
                  type="text"
                  required
                  value={editingLesson.title}
                  onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-600 uppercase tracking-wider block">
                  Conteúdo da Aula (Markdown)
                </label>
                <textarea
                  rows={8}
                  required
                  value={editingLesson.content}
                  onChange={(e) => setEditingLesson({ ...editingLesson, content: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-sm font-mono text-zinc-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  Salvar Alterações da Aula
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal de Confirmação de Matrícula na Trilha */}
      {enrollModalTrilha && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto overscroll-contain"
          onClick={() => setEnrollModalTrilha(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-zinc-200 space-y-5 my-auto"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0b439c] flex items-center justify-center shrink-0 border border-blue-100">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#0b439c]">
                  Matrícula na Trilha
                </span>
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-zinc-900 leading-snug mt-0.5">
                  Você quer se matricular nessa trilha de estudo?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEnrollModalTrilha(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
              <p className="font-bold text-sm text-zinc-900 leading-snug">
                {enrollModalTrilha.name}
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Ao confirmar sua matrícula, a trilha será adicionada aos seus estudos, liberando imediatamente o acesso a todas as aulas, atividades e projetos.
              </p>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:justify-end">
              <button
                type="button"
                onClick={() => setEnrollModalTrilha(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Não, cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmEnrollTrilha(enrollModalTrilha.id, enrollModalTrilha.name)}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#0b439c] hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Sim, quero me matricular</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Confirmação de Desistência/Exclusão da Trilha */}
      {unenrollModalTrilha && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto overscroll-contain"
          onClick={() => setUnenrollModalTrilha(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-red-100 space-y-5 my-auto"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-black uppercase tracking-wider text-red-600">
                  Desistir da Trilha
                </span>
                <h3 className="font-display font-extrabold text-lg sm:text-xl text-zinc-900 leading-snug mt-0.5">
                  Você tem certeza que você quer desistir?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUnenrollModalTrilha(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-red-50/50 border border-red-100 space-y-2">
              <p className="font-bold text-sm text-zinc-900 leading-snug">
                {unenrollModalTrilha.name}
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Esta trilha será removida da sua lista de Meus Estudos. O acesso às aulas será bloqueado até que você realize uma nova matrícula.
              </p>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:justify-end">
              <button
                type="button"
                onClick={() => setUnenrollModalTrilha(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmUnenrollTrilha(unenrollModalTrilha.id, unenrollModalTrilha.name)}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, tenho certeza</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ==================== MODAL DE EXCLUSÃO DE CONTA COM VERIFICAÇÃO POR E-MAIL ==================== */}
      {isDeleteAccountModalOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto overscroll-contain"
          onClick={() => {
            if (deleteAccountStep !== 3 && !deleteAccountLoading) {
              setIsDeleteAccountModalOpen(false);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-6 my-auto"
          >
            {/* ETAPA 1: Aviso de Exclusão e Solicitação do Código */}
            {deleteAccountStep === 1 && (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
                      Você tem certeza que deseja excluir sua conta?
                    </h3>
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider mt-1">
                      Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </div>

                <div className="bg-red-50/70 border border-red-200 rounded-2xl p-4 text-xs text-red-800 space-y-2 leading-relaxed">
                  <p className="font-bold text-red-950">
                    Ao solicitar a exclusão da sua conta, todos os seus dados cadastrais, cursos concluídos e lições finalizadas serão excluídos.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-red-800 font-medium">
                    <li>Todos os seus dados cadastrais serão removidos do sistema.</li>
                    <li>Todo o seu progresso em cursos e aulas concluídas será apagado.</li>
                    <li>Esta ação é definitiva e não pode ser desfeita.</li>
                  </ul>
                </div>

                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs text-zinc-600 space-y-1.5 leading-relaxed">
                  <p className="font-bold text-zinc-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#0b439c]" />
                    Verificação de Segurança Obrigatória
                  </p>
                  <p>
                    Para sua segurança e para evitar que outra pessoa exclua sua conta, enviaremos um código de verificação de 6 dígitos para o seu e-mail cadastrado:
                  </p>
                  <p className="font-extrabold text-zinc-900 bg-white px-3 py-1.5 rounded-lg border border-zinc-200 inline-block text-xs mt-1">
                    {user?.email || "Seu e-mail cadastrado"}
                  </p>
                </div>

                {deleteAccountError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-700 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{deleteAccountError}</span>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    disabled={deleteAccountLoading}
                    onClick={() => setIsDeleteAccountModalOpen(false)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={deleteAccountLoading}
                    onClick={handleRequestDeleteCode}
                    className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-red-950/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {deleteAccountLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Enviar Código de Confirmação</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 2: Digitação do Código de 6 Dígitos com Botões Cancelar e Excluir */}
            {deleteAccountStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                    <Lock className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
                      Confirmar Exclusão de Conta
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Insira o código de 6 dígitos enviado para <strong>{user?.email}</strong>
                    </p>
                  </div>
                </div>

                {deleteAccountSuccess && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-[#0b439c] font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0b439c]" />
                    <span>{deleteAccountSuccess}</span>
                  </div>
                )}

                {/* Input do Código */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 block">
                      Código de 6 Dígitos
                    </label>
                    {deleteAccountTimer > 0 ? (
                      <span className="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-zinc-400" />
                        Expira em {Math.floor(deleteAccountTimer / 60)}:{(deleteAccountTimer % 60).toString().padStart(2, "0")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestDeleteCode}
                        className="text-[11px] font-extrabold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reenviar código
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    value={deleteAccountCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setDeleteAccountCode(val);
                      if (deleteAccountError) setDeleteAccountError(null);
                    }}
                    placeholder="000000"
                    autoFocus
                    className="w-full bg-zinc-50 border-2 border-zinc-200 focus:border-red-600 focus:bg-white rounded-2xl py-3.5 text-center text-3xl font-black font-mono tracking-[0.5em] text-zinc-900 focus:outline-none transition-all"
                  />
                  <p className="text-[11px] text-zinc-400 text-center font-medium">
                    Consulte a sua caixa de entrada no e-mail cadastrado.
                  </p>
                </div>

                {deleteAccountError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-700 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{deleteAccountError}</span>
                  </div>
                )}

                {/* Botões Cancelar e Excluir Conta */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    disabled={deleteAccountLoading}
                    onClick={() => {
                      setIsDeleteAccountModalOpen(false);
                      setDeleteAccountStep(1);
                      setDeleteAccountCode("");
                      setDeleteAccountError(null);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={deleteAccountCode.trim().length !== 6 || deleteAccountLoading}
                    onClick={handleConfirmDeleteAccount}
                    className={`w-full sm:w-auto px-6 py-2.5 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 ${
                      deleteAccountCode.trim().length === 6 && !deleteAccountLoading
                        ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-md shadow-red-950/20 active:scale-95"
                        : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                    }`}
                  >
                    {deleteAccountLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir Conta</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 3: Mensagem Final "Sua conta foi excluída" com Botão para a Tela Inicial */}
            {deleteAccountStep === 3 && (
              <div className="space-y-6 py-3 text-center">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200 shadow-md shadow-emerald-900/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                    Sua conta foi excluída
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 max-w-sm mx-auto leading-relaxed">
                    Todos os seus dados cadastrais, histórico de aprendizado, lições concluídas e cursos foram excluídos permanentemente da nossa base de dados.
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteAccountModalOpen(false);
                      setDeleteAccountStep(1);
                      setDeleteAccountCode("");
                      setActiveTab("dashboard");
                      setAuthMode("login");
                    }}
                    className="w-full py-3 bg-[#0b439c] hover:bg-blue-800 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-900/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar para a Tela Inicial</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ==================== MODAL DE VERIFICAÇÃO DE SEGURANÇA PARA ALTERAÇÃO DE DADOS ==================== */}
      {isProfileSecurityModalOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto overscroll-contain"
          onClick={() => {
            if (!profileSecurityLoading) {
              setIsProfileSecurityModalOpen(false);
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-zinc-200 space-y-6 my-auto"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0b439c] flex items-center justify-center shrink-0 border border-blue-100">
                <ShieldCheck className="w-7 h-7 text-[#0b439c]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
                  Verificação de Segurança Obrigatória
                </h3>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                  Confirmação de identidade para salvar dados protegidos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!profileSecurityLoading) setIsProfileSecurityModalOpen(false);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs text-zinc-600 space-y-2 leading-relaxed">
              <p>
                Para a sua segurança e evitar que terceiros alterem seus dados sem autorização, enviamos um código de verificação de 6 dígitos para o seu e-mail cadastrado:
              </p>
              <p className="font-extrabold text-zinc-900 bg-white px-3 py-1.5 rounded-lg border border-zinc-200 inline-block text-xs">
                {user?.email || "Seu e-mail atual"}
              </p>
            </div>

            {/* Resumo das alterações solicitadas */}
            {pendingProfileChanges && (
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900 space-y-1.5">
                <span className="font-bold text-[11px] uppercase tracking-wider text-blue-700 block">
                  Alterações que serão salvas:
                </span>
                <ul className="space-y-1 font-medium">
                  {pendingProfileChanges.name !== studentName && (
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block shrink-0" />
                      <span>Nome: <strong>{pendingProfileChanges.name}</strong></span>
                    </li>
                  )}
                  {pendingProfileChanges.email !== (user?.email || "").toLowerCase() && (
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block shrink-0" />
                      <span>Novo e-mail: <strong>{pendingProfileChanges.email}</strong></span>
                    </li>
                  )}
                  {pendingProfileChanges.password && (
                    <li className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block shrink-0" />
                      <span>Senha de acesso: <strong>Nova senha definida</strong></span>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {profileSecurityError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{profileSecurityError}</span>
              </div>
            )}

            {/* Input do Código */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                Digite o Código de 6 Dígitos
              </label>
              <input
                type="text"
                maxLength={6}
                value={profileSecurityCode}
                onChange={(e) => {
                  setProfileSecurityCode(e.target.value.replace(/\D/g, ""));
                  setProfileSecurityError(null);
                }}
                placeholder="000000"
                className="w-full text-center tracking-[10px] text-2xl font-black bg-zinc-50 border-2 border-zinc-200 rounded-2xl py-3 text-zinc-900 focus:outline-none focus:border-[#0b439c] focus:bg-white transition-all shadow-inner"
              />
              <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                <span>Válido por 15 minutos</span>
                <button
                  type="button"
                  disabled={profileSecurityTimer > 0 || profileSecurityLoading}
                  onClick={() => {
                    if (pendingProfileChanges) {
                      const currentEmail = (user?.email || "").trim().toLowerCase();
                      handleSendProfileSecurityCode(
                        currentEmail,
                        pendingProfileChanges.email,
                        !!pendingProfileChanges.password
                      );
                    }
                  }}
                  className="text-blue-600 font-bold hover:underline disabled:text-zinc-400 disabled:no-underline cursor-pointer"
                >
                  {profileSecurityTimer > 0 ? `Reenviar código em ${profileSecurityTimer}s` : "Reenviar código"}
                </button>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={profileSecurityLoading}
                onClick={() => setIsProfileSecurityModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={profileSecurityLoading || profileSecurityCode.length !== 6}
                onClick={handleConfirmProfileSecurityCode}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#0b439c] hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {profileSecurityLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Validando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar e Salvar</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}






    </div>
  );
}
