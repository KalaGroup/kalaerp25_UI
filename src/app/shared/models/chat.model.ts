export interface Chat {
    text: string;
    time: Date | string;
    contactId: User['id'];
  }
  
  export interface ChatCollection {
    id: string;
    chats: Chat[];
  }
  
  export interface UserChatInfo {
    chatId: ChatCollection['id'];
    contactId: User['id'];
    contactName: User['name'];
    unread: number;
    lastChatTime: Date | string;
  }
  
  export class User {
    id: string;
    avatar: string;
    name: string;
    status: string;
    chatInfo?: UserChatInfo[];
  }
  