import EmbeddableChatbox from './embeddable-chatbox';
import defaultConfig from '../defaultConfig';

const config = defaultConfig;

export default function bookmarklet() {
  if (window.EmbeddableChatbox) {
    return;
  }
  window.EmbeddableChatbox = EmbeddableChatbox;

  EmbeddableChatbox.mount(config);
}

bookmarklet();
