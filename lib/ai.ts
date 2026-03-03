import { GoogleGenAI, Type } from "@google/genai";
import { ExamTopic } from "./scheduler";

export interface VerticalizedResult {
  title: string;
  date?: string;
  location?: string;
  salaries?: string;
  relevantInfo?: string;
  syllabus: ExamTopic[];
}

export const verticalizeSyllabus = async (syllabusText: string): Promise<VerticalizedResult> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Você é um especialista em concursos públicos. 
    Abaixo está o texto de um edital. Sua tarefa é extrair as informações relevantes e "verticalizar" este edital, organizando-o por matéria e por tópicos detalhados.
    
    Informações a extrair:
    1. Nome do Concurso (title)
    2. Data da Prova (date) - se constar
    3. Local e Horário (location) - se constar
    4. Salários por cargo (salaries) - se constar
    5. Conteúdo separado por nível ou observações relevantes (relevantInfo) - se houver
    6. Edital Verticalizado (syllabus) - lista de matérias e tópicos
    
    Texto do Edital:
    ${syllabusText}
    
    Retorne o resultado em um formato JSON.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          date: { type: Type.STRING },
          location: { type: Type.STRING },
          salaries: { type: Type.STRING },
          relevantInfo: { type: Type.STRING },
          syllabus: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                topics: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["subject", "topics"]
            }
          }
        },
        required: ["title", "syllabus"]
      }
    }
  });

  try {
    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (e) {
    console.error("Error parsing AI response:", e);
    return { title: "Concurso Desconhecido", syllabus: [] };
  }
};

export interface OpenExam {
  name: string;
  organization: string;
  link: string;
  date?: string;
  status: string;
  salary?: string;
}

export const searchOpenExams = async (interestArea: string, level: string): Promise<OpenExam[]> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is missing");

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Aja como um assistente de busca de concursos públicos. 
    Encontre concursos abertos ou com edital publicado recentemente na área de "${interestArea}" para o nível "${level}".
    Foque em concursos no Brasil.
    Retorne uma lista de concursos com: nome, órgão, link para o edital ou notícia, data da prova (se houver), status e salário (se houver).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            organization: { type: Type.STRING },
            link: { type: Type.STRING },
            date: { type: Type.STRING },
            status: { type: Type.STRING },
            salary: { type: Type.STRING }
          },
          required: ["name", "organization", "link", "status"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Error parsing search results:", e);
    return [];
  }
};

export interface SimuladoQuestionAI {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export const generateSimulado = async (subject: string, quantity: number): Promise<SimuladoQuestionAI[]> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is missing");

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Crie um simulado de concurso público sobre o tema: "${subject}".
    Gere exatamente ${quantity} questões de múltipla escolha.
    Cada questão deve ter 4 opções (A, B, C, D).
    Indique o índice da opção correta (0 a 3) e forneça uma breve explicação do porquê aquela é a resposta correta.
    As questões devem ser desafiadoras e no estilo de bancas de concursos brasileiros (como FGV, FCC, Cebraspe).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              minItems: 4,
              maxItems: 4
            },
            correctOptionIndex: { type: Type.INTEGER },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctOptionIndex", "explanation"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Error parsing simulado:", e);
    return [];
  }
};
