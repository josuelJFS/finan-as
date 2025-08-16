// Formatação de moeda
export const formatCurrency = (amount: number, currency = "BRL"): string => {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback se a moeda não for suportada
    return `R$ ${amount.toFixed(2).replace(".", ",")}`;
  }
};

// Formatação de número
export const formatNumber = (value: number, locale = "pt-BR"): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Parse de valor monetário
export const parseCurrency = (value: string): number => {
  // Remove símbolos de moeda e espaços
  const cleaned = value
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "") // Remove pontos (milhares)
    .replace(",", "."); // Troca vírgula por ponto (decimal)

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Formatação de data
export const formatDate = (date: string | Date, format = "DD/MM/YYYY"): string => {
  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return "";
  }

  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();

  switch (format) {
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "DD/MM":
      return `${day}/${month}`;
    case "MMM YYYY":
      return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    default:
      return d.toLocaleDateString("pt-BR");
  }
};

// Formatação de data/hora
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Formatação relativa de tempo
export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Hoje";
  } else if (diffDays === 1) {
    return "Ontem";
  } else if (diffDays === -1) {
    return "Amanhã";
  } else if (diffDays > 1 && diffDays <= 7) {
    return `${diffDays} dias atrás`;
  } else if (diffDays < -1 && diffDays >= -7) {
    return `Em ${Math.abs(diffDays)} dias`;
  } else {
    return formatDate(d);
  }
};

// Gerar ID único
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Validação de email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validação de valor monetário
export const isValidAmount = (amount: string | number): boolean => {
  const num = typeof amount === "string" ? parseCurrency(amount) : amount;
  return !isNaN(num) && num >= 0;
};

// Capitalizar primeira letra
export const capitalize = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Truncar texto
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + "...";
};

// Gerar cor baseada em string
export const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

// Debounce para busca
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: number;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle para scroll
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Calcular percentual
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

// Interpolar cor baseada em percentual
export const interpolateColor = (percentage: number): string => {
  // Verde (0%) -> Amarelo (50%) -> Vermelho (100%)
  if (percentage <= 50) {
    // Verde para amarelo
    const ratio = percentage / 50;
    const r = Math.round(34 + (255 - 34) * ratio);
    const g = Math.round(197 + (193 - 197) * ratio);
    const b = Math.round(94 + (7 - 94) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Amarelo para vermelho
    const ratio = (percentage - 50) / 50;
    const r = Math.round(255);
    const g = Math.round(193 + (87 - 193) * ratio);
    const b = Math.round(7 + (51 - 7) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// Validar CPF (brasileiro)
export const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, "");

  if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }

  // Validar dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }

  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;

  if (digit1 !== parseInt(cleaned.charAt(9))) {
    return false;
  }

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }

  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;

  return digit2 === parseInt(cleaned.charAt(10));
};

// Formatar CPF
export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};
