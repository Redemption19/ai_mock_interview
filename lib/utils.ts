import { interviewCovers, mappings } from "@/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const techIconBaseURL = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

const normalizeTechName = (tech: string) => {
  const key = tech.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
  return mappings[key as keyof typeof mappings];
};

const checkIconExists = async (url: string) => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok; // Returns true if the icon exists
  } catch {
    return false;
  }
};

export const getTechLogos = async (techArray: string[]) => {
  const logoURLs = techArray.map((tech) => {
    const normalized = normalizeTechName(tech);
    return {
      tech,
      url: `${techIconBaseURL}/${normalized}/${normalized}-original.svg`,
    };
  });

  const results = await Promise.all(
    logoURLs.map(async ({ tech, url }) => ({
      tech,
      url: (await checkIconExists(url)) ? url : "/tech.svg",
    }))
  );

  return results;
};

export const getRandomInterviewCover = () => {
  const randomIndex = Math.floor(Math.random() * interviewCovers.length);
  return `/covers${interviewCovers[randomIndex]}`;
};

export async function uploadToCloudinary(file: File, type: 'profile' | 'resume'): Promise<{ url: string; vapiFileId?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    console.log('Uploading file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    if (type === 'resume' && !data.vapiFileId) {
      throw new Error('Failed to get VAPI file ID');
    }

    return {
      url: data.url,
      vapiFileId: data.vapiFileId
    };
  } catch (error) {
    console.error(`${type} upload error:`, error);
    throw error;
  }
}

export async function parseResume(file: File): Promise<string> {
  // For now, return empty string as resume parsing is not implemented
  return '';
}
