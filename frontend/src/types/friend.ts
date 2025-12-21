export interface User {
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  defaultLat?: number | null;
  defaultLng?: number | null;
  defaultAddress?: string | null;
  defaultLocationName?: string | null;
}

export interface Friend extends User {
  createdAt: string;
}

export interface FriendRequest {
  id: number;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  updatedAt: string;
  fromUser?: User;
  toUser?: User;
}

