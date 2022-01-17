const DEFAULT_TERMS_URL = 'https://tosdr.org/';
const DEFAULT_ROOM_NAME = 'Support Chat';
const DEFAULT_INTRO_MESSAGE = 'This chat application does not collect any of your personal data or any data from your use of this service.';
const DEFAULT_AGREEMENT_MESSAGE = 'Do you want to continue?';
const DEFAULT_CONFIRMATION_MESSAGE = 'Waiting for a facilitator to join the chat...';
const DEFAULT_EXIT_MESSAGE = 'The chat is closed. You may close this window.';
const DEFAULT_DISPLAY_NAME = 'Anonymous';
const DEFAULT_CHAT_UNAVAILABLE_MESSAGE = 'The chat service is not available right now. Please try again later.';
const DEFAULT_CHAT_OFFLINE_MESSAGE = 'All of the chat facilitators are currently offline.';
const DEFAULT_WAIT_MESSAGE = 'Please be patient, our online facilitators are currently responding to other support requests.';
const DEFAULT_ENCRYPTION_DISABLED = false;
const DEFAULT_POSITION = 'bottom right';
const DEFAULT_SIZE = 'large';
const DEFAULT_WAIT_INTERVAL_MS = 120000; // 2 minutes
const DEFAULT_DOCK_LABEL = 'Start a new chat';
const DEFAULT_ENABLED = true;
const DEFAULT_AVAILABLE = true;

const defaultConfig = {
  termsUrl: DEFAULT_TERMS_URL,
  roomName: DEFAULT_ROOM_NAME,
  introMessage: DEFAULT_INTRO_MESSAGE,
  agreementMessage: DEFAULT_AGREEMENT_MESSAGE,
  confirmationMessage: DEFAULT_CONFIRMATION_MESSAGE,
  exitMessage: DEFAULT_EXIT_MESSAGE,
  displayName: DEFAULT_DISPLAY_NAME,
  chatUnavailableMessage: DEFAULT_CHAT_UNAVAILABLE_MESSAGE,
  waitMessage: DEFAULT_WAIT_MESSAGE,
  chatOfflineMessage: DEFAULT_CHAT_OFFLINE_MESSAGE,
  isEncryptionDisabled: DEFAULT_ENCRYPTION_DISABLED,
  position: DEFAULT_POSITION,
  size: DEFAULT_SIZE,
  waitInterval: DEFAULT_WAIT_INTERVAL_MS,
  dockLabel: DEFAULT_DOCK_LABEL,
  enabled: DEFAULT_ENABLED,
  isAvailable: DEFAULT_AVAILABLE,
};

export default defaultConfig;
