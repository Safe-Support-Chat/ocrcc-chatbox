import EmbeddableChatbox from './embeddable-chatbox';

var config = {
        matrixServerUrl: 'https://matrix.safesupport.chat',
        botId: '@help-bot:safesupport.chat',
        roomName: 'Support Chat',
        termsUrl: 'https://tosdr.org/',
        introMessage: "This is just a demo! There is probably no-one at the other end. You should probaby email us instead. But if you're lucky, there might be someone online to say hi!",
        agreementMessage: 'Do you want to continue?',
        confirmationMessage: 'Waiting for a facilitator to join the chat...',
        exitMessage: 'The chat is closed. You may close this window.',
        chatUnavailableMessage: 'The chat service is not available right now. Please try again later.',
        anonymousDisplayName: 'Anonymous',
    }

export default function bookmarklet() {
  if (window.EmbeddableChatbox) {
    return;
  }
  window.EmbeddableChatbox = EmbeddableChatbox;

  EmbeddableChatbox.mount(config);
}

bookmarklet();
