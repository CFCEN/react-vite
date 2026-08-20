import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';
import { message as staticMessage, notification as staticNotification } from 'antd';

/**
 * Bridge for antd App.useApp() → usable outside React (axios interceptors, QueryCache).
 * Falls back to static APIs if App bridge is not yet mounted.
 */

let messageApi: MessageInstance | null = null;
let notificationApi: NotificationInstance | null = null;

export function setAntdAppApis(
  message: MessageInstance,
  notification: NotificationInstance,
): void {
  messageApi = message;
  notificationApi = notification;
}

export function getMessage(): MessageInstance {
  return messageApi ?? staticMessage;
}

export function getNotification(): NotificationInstance {
  return notificationApi ?? staticNotification;
}
