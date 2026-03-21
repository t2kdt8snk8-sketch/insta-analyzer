export interface ScrapedProfile {
  username: string;
  full_name?: string;
  bio?: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  profile_image_url?: string;
  is_verified?: boolean;
}

export interface ScrapedPost {
  post_url: string;
  image_urls: string[];
  image_data?: { base64: string; mimeType: string }[]; // Playwright로 다운로드된 이미지
  caption: string;
  hashtags: string[];
  likes_count: number;
  comments_count: number;
  posted_at?: string;
  is_reel: boolean;
  is_carousel: boolean;
}

// ==========================================
// Agentic Flow Types
// ==========================================

export interface SupportingAccount {
  username: string;
  reasonToInclude: string;
}

export interface AgentReport {
  summary: string;
  keyPatterns: string[];
  visualTrends: string[];
  captionTrends: string[];
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  supportingAccounts: SupportingAccount[];
  recommendations: string[];
  limitations: string;
}
