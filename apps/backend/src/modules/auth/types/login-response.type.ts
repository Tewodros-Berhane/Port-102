import type { LocalAuthenticatedMembership } from './local-authenticated-user.type';
import type { TokenPair } from './token-pair.type';

export type LoginResponse = {
  status: 'authenticated';
  user: {
    id: number;
    email: string;
    fullName: string;
  };
  requiresHotelSelection: boolean;
  activeHotel: LocalAuthenticatedMembership['hotel'] | null;
  membership: LocalAuthenticatedMembership | null;
  hotelChoices: LocalAuthenticatedMembership[];
  tokens: TokenPair | null;
};
