export interface UserProfile {
  fullName?: string;
  phone?: string;
  address?: string;
  avatar?: string;
}

export interface SteamProfile {
  displayName?: string;
  avatar?: string;
  profileUrl?: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  createdAt: string;
  isEmailVerified: boolean;
  profile?: UserProfile;
  steamId?: string;
  steamProfile?: SteamProfile;
  favorites: string[];
  balance: number;
  role: 'user' | 'admin';
  isBanned: boolean;
}

export interface UserWithStats extends User {
  stats: {
    activeListings: number;
    completedSales: number;
    totalEarnings: number;
  };
}
