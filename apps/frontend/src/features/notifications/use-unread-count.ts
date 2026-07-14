"use client";
import { useQuery } from "@tanstack/react-query";
import { getUnreadCount } from "./notifications.service";
export function useUnreadCount(enabled = true) { return useQuery({ queryKey: ["notifications", "unread-count"], queryFn: getUnreadCount, enabled }); }
