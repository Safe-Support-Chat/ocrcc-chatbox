import React from "react"
import PropTypes from "prop-types"
import { Transition } from 'react-transition-group';
import * as util from "util";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { LocalStorage } from "node-localstorage";
import * as olm from "olm/olm_legacy.js"
global.Olm = olm

import * as matrix from "matrix-js-sdk";
import {uuid} from "uuidv4"

import Message from "./message";
import Dock from "./dock";
import Header from "./header";
import EmojiSelector from './emoji-selector';

import './styles.scss';


const ENCRYPTION_CONFIG = { "algorithm": "m.megolm.v1.aes-sha2" };
const ENCRYPTION_NOTICE = "Messages in this chat are secured with end-to-end encryption."
const UNENCRYPTION_NOTICE = "Messages in this chat are not encrypted."
const RESTARTING_UNENCRYPTED_CHAT_MESSAGE = "Restarting chat without encryption."
const CHAT_IS_OFFLINE_NOTICE = "CHAT_OFFLINE"

const DEFAULT_MATRIX_SERVER = "https://matrix.rhok.space/"
const DEFAULT_BOT_ID = "@help-bot:rhok.space"
const DEFAULT_TERMS_URL = "https://tosdr.org/"
const DEFAULT_ROOM_NAME = "Support Chat"
const DEFAULT_INTRO_MESSAGE = "This chat application does not collect any of your personal data or any data from your use of this service."
const DEFAULT_AGREEMENT_MESSAGE = "Do you want to continue?"
const DEFAULT_CONFIRMATION_MESSAGE = "Waiting for a facilitator to join the chat..."
const DEFAULT_EXIT_MESSAGE = "The chat is closed. You may close this window."
const DEFAULT_ANONYMOUS_DISPLAY_NAME="Anonymous"
const DEFAULT_CHAT_UNAVAILABLE_MESSAGE = "The chat service is not available right now. Please try again later."
const DEFAULT_CHAT_OFFLINE_MESSAGE = "All of the chat facilitators are currently offline."
const DEFAULT_WAIT_MESSAGE = "Please be patient, our online facilitators are currently responding to other support requests."
const DEFAULT_ENCRYPTION_DISABLED = false
const DEFAULT_POSITION = 'bottom right'
const DEFAULT_SIZE = 'large'
const DEFAULT_MAX_WAIT_MS = 600000 // 10 minutes
const DEFAULT_WAIT_INTERVAL_MS = 120000 // 2 minutes


class ChatBox extends React.Component {
  constructor(props) {
    super(props)
    this.initialState = {
      opened: false,
      showDock: true,
      client: null,
      ready: true,
      accessToken: null,
      userId: null,
      password: null,
      localStorage: null,
      messages: {},
      inputValue: "",
      errors: [],
      roomId: null,
      typingStatus: null,
      awaitingAgreement: true,
      emojiSelectorOpen: false,
      facilitatorInvited: false,
      isMobile: true,
      isSlowConnection: true,
      decryptionErrors: {},
      messagesInFlight: []
    }
    this.state = this.initialState
    this.chatboxInput = React.createRef();
    this.messageWindow = React.createRef();
    this.termsUrl = React.createRef();
  }

  detectMobile = () => {
    let isMobile = false;

    if ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
      isMobile = true;
    }

    if (screen.width < 767) {
      isMobile = true;
    }

    this.setState({ isMobile })
  }

  detectSlowConnection = () => {
    let isSlowConnection = false;

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (typeof connection !== 'undefined' || connection === null) {
      const connectionType = connection.effectiveType;
      const slowConnections = ['slow-2g', '2g']

      isSlowConnection = slowConnections.includes(connectionType)
    }

    this.setState({ isSlowConnection })
  }

  handleToggleOpen = () => {
    this.setState((prev) => {
      let { showDock } = prev;
      if (!prev.opened) {
        showDock = false;
      }
      return {
        showDock,
        opened: !prev.opened,
      };
    });
  }

  toggleEmojiSelector = (e) => {
    e.preventDefault();
    this.setState({ emojiSelectorOpen: !this.state.emojiSelectorOpen })
  }

  closeEmojiSelector = () => {
    this.setState({ emojiSelectorOpen: false })
  }

  handleWidgetExit = () => {
    this.setState({
      showDock: true,
    });
  }

  handleWidgetEnter = () => {
    if (this.state.awaitingAgreement) {
      this.termsUrl.current.focus()
    } else {
      this.chatboxInput.current.focus()
    }
  }

  handleExitChat = () => {
    if (this.state.client) {
      this.exitChat()
    } else {
      this.setState(this.initialState)
    }
  }

  exitChat = async (resetState=true) => {
    if (this.state.client) {
      await this.state.client.leave(this.state.roomId)

      const auth = {
        type: 'm.login.password',
        user: this.state.userId,
        identifier: {
            type: "m.id.user",
            user: this.state.userId,
        },
        password: this.state.password,
      };

      await this.state.client.deactivateAccount(auth, true)
      await this.state.client.stopClient()
      await this.state.client.clearStores()
      this.setState({ client: null })
    }

    this.state.localStorage.clear()

    if (resetState) {
      this.setState(this.initialState)
    }
  }

  createLocalStorage = async (deviceId, sessionId) => {
    let localStorage = global.localStorage;
    if (typeof localStorage === "undefined" || localStorage === null) {
      const deviceDesc = `matrix-chat-${deviceId}-${sessionId}`
      const localStoragePath = path.resolve(path.join(os.homedir(), ".local-storage", deviceDesc))
      localStorage = new LocalStorage(localStoragePath);
    }
    return localStorage;
  }

  createClientWithAccount = async () => {
    const tmpClient = matrix.createClient(this.props.matrixServerUrl)

    try {
      await tmpClient.registerRequest({})
    } catch(err) {
      const username = uuid()
      const password = uuid()
      const sessionId = err.data.session

      const account = await tmpClient.registerRequest({
        auth: {session: sessionId, type: "m.login.dummy"},
        inhibit_login: false,
        password: password,
        username: username,
        x_show_msisdn: true,
      })

      const localStorage = await this.createLocalStorage(account.device_id, sessionId)

      this.setState({
        accessToken: account.access_token,
        userId: account.user_id,
        username: username,
        password: password,
        localStorage: localStorage,
        sessionId: sessionId,
        deviceId: account.device_id,
      })

      let opts = {
        baseUrl: this.props.matrixServerUrl,
        accessToken: account.access_token,
        userId: account.user_id,
        deviceId: account.device_id,
        sessionStore: new matrix.WebStorageSessionStore(localStorage),
      }

      return matrix.createClient(opts)
    }
  }

  initializeChat = async () => {
    this.setState({ ready: false })

    const client = await this.createClientWithAccount()
    try {
      await client.initCrypto()
    } catch(err) {
      return this.restartWithoutCrypto()
    }

    await client.startClient()

    client.once('sync', async (state, prevState, data) => {
      if (state === "PREPARED") {
        this.setState({ client })
        client.setDisplayName(this.props.anonymousDisplayName)
        this.setMatrixListeners(client)
        await this.createRoom(client)
      }
    })
  }

  restartWithoutCrypto = async () => {
    if (this.state.client) {
      this.state.client.leave(this.state.roomId)
      this.state.client.stopClient()
      this.state.client.clearStores()
      this.state.localStorage.clear()
    }

    this.setState({
      ready: false,
      facilitatorInvited: false,
      decryptionErrors: {},
      roomId: null,
      typingStatus: null,
      client: null,
      isCryptoEnabled: false,
    })

    this.displayBotMessage({ body: RESTARTING_UNENCRYPTED_CHAT_MESSAGE })

    let opts = {
      baseUrl: this.props.matrixServerUrl,
      accessToken: this.state.accessToken,
      userId: this.state.userId,
      deviceId: this.state.deviceId,
    }

    let client;
    client = matrix.createClient(opts)
    await client.startClient()

    client.once('sync', async (state, prevState, data) => {
      if (state === "PREPARED") {
        try {
          this.setState({ client })
          client.setDisplayName(this.props.anonymousDisplayName)
          this.setMatrixListeners(client)
          await this.createRoom(client)
          this.displayBotMessage({ body: UNENCRYPTION_NOTICE })
        } catch(err) {
          console.log("error", err)
          this.handleInitError(err)
        }
      }
    })
  }


  initializeUnencryptedChat = async () => {
    this.setState({ ready: false })
    const client = await this.createClientWithAccount()
    await client.startClient()

    client.once('sync', async (state, prevState, data) => {
      client.setDisplayName(this.props.anonymousDisplayName)
      this.setMatrixListeners(client)
      await this.createRoom(client)
    })
  }

  handleInitError = (err) => {
    console.log("error", err)
    this.displayBotMessage({ body: this.props.chatUnavailableMessage })
    this.setState({ ready: true })
  }

  handleDecryptionError = async (event, err) => {
    const eventId = event.getId()
    this.handleMessageEvent(event)
    this.setState({ decryptionErrors: { [eventId]: true }})
  }

  verifyAllRoomDevices = async (client, room) => {
    if (!room) return;
    if (!client) return;
    if (!this.state.isCryptoEnabled) return;

    let members = (await room.getEncryptionTargetMembers()).map(x => x["userId"])
    let memberkeys = await client.downloadKeys(members);
    for (const userId in memberkeys) {
      for (const deviceId in memberkeys[userId]) {
        await client.setDeviceVerified(userId, deviceId);
      }
    }
  }

  createRoom = async (client) => {
    const currentDate = new Date()
    const chatDate = currentDate.toLocaleDateString()
    const chatTime = currentDate.toLocaleTimeString()
    let roomConfig = {
      room_alias_name: `private-support-chat-${uuid()}`,
      invite: [this.props.botId],
      visibility: 'private',
      name: `${chatTime}, ${chatDate} - ${this.props.roomName}`,
    }

    const isCryptoEnabled = await client.isCryptoEnabled()

    if (isCryptoEnabled) {
      roomConfig.initial_state = [
        {
          type: 'm.room.encryption',
          state_key: '',
          content: ENCRYPTION_CONFIG,
        },
      ]
    }

    const { room_id } = await client.createRoom(roomConfig)

    client.setPowerLevel(room_id, this.props.botId, 100)

    this.setState({
      roomId: room_id,
      isCryptoEnabled
    })
  }

  sendMessage = async (message) => {
    if (this.state.client && this.state.roomId) {
      try {
        await this.state.client.sendTextMessage(this.state.roomId, message)
      } catch(err) {
          switch (err["name"]) {
          case "UnknownDeviceError":
            Object.keys(err.devices).forEach((userId) => {
              Object.keys(err.devices[userId]).map(async (deviceId) => {
                await this.state.client.setDeviceKnown(userId, deviceId, true);
              });
            });
            this.sendMessage(message)
            break;
          default:
            this.displayBotMessage({ body: "Your message was not sent." })
            console.log("Error sending message", err);
        }
      }
    }
  }

  displayFakeMessage = (content, sender, messageId=uuid()) => {
    const msg = {
      id: messageId,
      type: 'm.room.message',
      sender: sender,
      roomId: this.state.roomId,
      content: content,
      timestamp: Date.now(),
    }

    this.setState({
      messages: {
        ...this.state.messages,
        [messageId]: msg
      }
    })
  }

  displayBotMessage = (content, roomId, messageId=uuid()) => {
    const msg = {
      id: messageId,
      type: 'm.room.message',
      sender: this.props.botId,
      roomId: roomId || this.state.roomId,
      content: content,
      timestamp: Date.now(),
    }

    this.setState({
      messages: {
        ...this.state.messages,
        [messageId]: msg
      }
    })
  }

  handleMessageEvent = event => {
    const message = {
      id: event.getId(),
      type: event.getType(),
      sender: event.getSender(),
      roomId: event.getRoomId(),
      content: event.getContent(),
      timestamp: event.getTs(),
    }

    // there's also event.getClearContent() which only works on encrypted messages
    // but not really sure when it should be used vs event.getContent()

    if (message.content.showToUser && message.content.showToUser !== this.state.userId) {
      return;
    }

    if (message.content.body.startsWith('!bot') && message.sender !== this.state.userId) {
      return;
    }

    const messagesInFlight = [...this.state.messagesInFlight]
    const placeholderMessageIndex = messagesInFlight.findIndex(msg => msg === message.content.body)
    if (placeholderMessageIndex > -1) {
      messagesInFlight.splice(placeholderMessageIndex, 1)
      this.setState({ messagesInFlight })
    }

    const decryptionErrors = {...this.state.decryptionErrors}
    delete decryptionErrors[message.id]

    const isOfflineNotice = message.content.msgtype === "m.notice" && message.content.body === CHAT_IS_OFFLINE_NOTICE

    let newMessage = message

    // when the bot sends a notice that the chat is offline
    // replace the message with the client-configured message
    // for now we're treating m.notice and m.text messages the same
    if (isOfflineNotice) {
      newMessage = {
        ...message,
        content: {
          ...message.content,
          body: this.props.chatOfflineMessage
        }
      }
      this.handleChatOffline()
    }

    this.setState({
      messages: {
        ...this.state.messages,
        [message.id]: newMessage,
      },
      decryptionErrors
    })
  }

  handleChatOffline = () => {
    this.exitChat(false) // close the chat connection but keep chatbox state
    window.clearInterval(this.state.waitIntervalId) // no more waiting messages
    window.clearInterval(this.state.waitTimeoutId) // no more waiting messages
    this.setState({ ready: true }) // no more loading animation
  }

  handleKeyDown = (e) => {
    switch (e.keyCode) {
      case 27:
        if (this.state.emojiSelectorOpen) {
          this.closeEmojiSelector()
        } else if (this.state.opened) {
          this.handleToggleOpen()
        };
      default:
        break;
    }
  }

  setMatrixListeners = client => {
    client.on("sync", (state, prevState, data) => {
      switch (state) {
        case "ERROR":
          // update UI to say "Connection Lost"
          break;
        case "SYNCING":
          // update UI to remove any "Connection Lost" message
          break;
        case "PREPARED":
          // the client instance is ready to be queried.
          this.setState({ client: client })
          break;
      }
    });

    client.on("Room.timeline", (event, room) => {
      const eventType = event.getType()
      const content = event.getContent()
      const sender = event.getSender()

      if (eventType === "m.room.encryption") {
        this.displayBotMessage({ body: ENCRYPTION_NOTICE }, room.room_id)
        this.verifyAllRoomDevices(client, room)
      }

      if (eventType === "m.room.message" && !this.state.isCryptoEnabled) {
        if (event.isEncrypted()) {
          return;
        }
        this.handleMessageEvent(event)
      }

      if (eventType === "m.room.member" && content.membership === "invite" && sender === this.props.botId) {
        this.setState({ facilitatorInvited: true })
      }

      if (eventType === "m.room.member" && content.membership === "join" && sender !== this.props.botId && sender !== this.state.userId) {
        this.verifyAllRoomDevices(client, room)
        this.setState({ facilitatorId: sender, ready: true })
        window.clearInterval(this.state.waitIntervalId)
        window.clearInterval(this.state.waitTimeoutId)
      }
    });


    client.on("Event.decrypted", (event, err) => {
      if (err) {
        return this.handleDecryptionError(event, err)
      }
      if (event.getType() === "m.room.message") {
        this.handleMessageEvent(event)
      }
    });

    client.on("RoomMember.typing", (event, member) => {
      if (member.typing && member.roomId === this.state.roomId) {
        this.setState({ typingStatus: `${member.name} is typing...` })
      }
      else {
        this.setState({ typingStatus: null })
      }
    });
  }

  componentDidUpdate(prevProps, prevState) {
    if ((prevState.messages !== this.state.messages) || (prevState.messagesInFlight !== this.state.messagesInFlight) || (prevState.typingStatus !== this.state.typingStatus)) {
      if (this.messageWindow.current.scrollTo) {
        this.messageWindow.current.scrollTo(0, this.messageWindow.current.scrollHeight)
      }
    }

    if (!prevState.facilitatorInvited && this.state.facilitatorInvited) {
      this.displayBotMessage({ body: this.props.confirmationMessage })
    }

    if (!prevState.opened && this.state.opened) {
      this.detectMobile()
      // not sure what to do with this
      // this.detectSlowConnection()
    }
  }

  componentDidMount() {
    document.addEventListener("keydown", this.handleKeyDown, false);
    window.addEventListener('beforeunload', this.exitChat)
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown, false);
    window.removeEventListener('beforeunload', this.exitChat)
    this.exitChat();
  }

  handleInputChange = e => {
    this.setState({ inputValue: e.target.value })
  }

  handleAcceptTerms = () => {
    this.setState({ awaitingAgreement: false })
    this.startWaitTimeForFacilitator()
    try {
      if (this.props.isEncryptionDisabled) {
        this.initializeUnencryptedChat()
      } else {
        this.initializeChat()
      }
    } catch(err) {
      this.handleInitError(err)
    }
  }

  startWaitTimeForFacilitator = () => {
    const waitIntervalId = window.setInterval(() => {
      if (!this.state.facilitatorId && !this.state.ready) {
        this.displayBotMessage({ body: this.props.waitMessage })
      }
    }, this.props.waitInterval)

    const waitTimeoutId = window.setTimeout(() => {
      if (!this.state.facilitatorId && !this.state.ready) {
        this.displayBotMessage({ body: this.props.chatUnavailableMessage })
        this.handleChatOffline()
      }
    }, this.props.maxWaitTime)

    this.setState({ waitIntervalId, waitTimeoutId })
  }

  handleRejectTerms = () => {
    this.exitChat()
    this.displayBotMessage({ body: this.props.exitMessage })
  }

  handleSubmit = e => {
    e.preventDefault()
    const message = this.state.inputValue
    if (!Boolean(message)) return null;

    if (this.state.isCryptoEnabled && this.state.client && !(this.state.client.isRoomEncrypted(this.state.roomId) && this.state.client.isCryptoEnabled())) return null;

    if (this.state.client && this.state.roomId) {
      const messagesInFlight = [...this.state.messagesInFlight]
      messagesInFlight.push(message)
      this.setState({ inputValue: "", messagesInFlight }, () => this.sendMessage(message))
      this.chatboxInput.current.focus()
    }
  }

  onEmojiClick = (event, emojiObject) => {
    event.preventDefault()
    const { emoji } = emojiObject;
    this.setState({
      inputValue: this.state.inputValue.concat(emoji),
      emojiSelectorOpen: false,
    }, this.chatboxInput.current.focus())
  }

  render() {
    const { ready, messages, messagesInFlight, inputValue, userId, roomId, typingStatus, opened, showDock, emojiSelectorOpen, isMobile, decryptionErrors } = this.state;
    const orderedMessages = Object.values(messages).sort((a,b) => a.timestamp - b.timestamp)
    const inputLabel = 'Send a message...'
    const [positionY, positionX] = this.props.position.split(' ')

    return (
      <div id="safesupport">
        <div className={`docked-widget size-${this.props.size}`} role="complementary" style={{ [positionY]: '10px', [positionX]: '10px' }}>
          <Transition in={opened} timeout={250} onExited={this.handleWidgetExit} onEntered={this.handleWidgetEnter}>
            {(status) => {
              return (
              <div className={`widget widget-${status} position-${positionY}`} aria-hidden={!opened}>
                <div id="safesupport-chatbox" aria-haspopup="dialog">
                  <Header handleToggleOpen={this.handleToggleOpen} opened={opened} handleExitChat={this.handleExitChat} />

                  <div className="message-window" ref={this.messageWindow}>
                    <div className="messages">
                      <div className={`message from-bot`}>
                        <div className="text">{ this.props.introMessage }</div>
                      </div>

                      <div className={`message from-bot`}>
                        <div className="text">Please read the full <a href={this.props.termsUrl} ref={this.termsUrl} target='_blank' rel='noopener noreferrer'>terms and conditions</a>. By using this chat, you agree to these terms.</div>
                      </div>

                      <div className={`message from-bot`}>
                        <div className="text">{ this.props.agreementMessage }</div>
                      </div>

                      <div className={`message from-bot`}>
                        <div className="text buttons">
                          {`👉`}
                          <button className="btn" id="accept" onClick={this.handleAcceptTerms}>YES</button>
                          <button className="btn" id="reject" onClick={this.handleRejectTerms}>NO</button>
                        </div>
                      </div>

                      {
                        orderedMessages.map((message, index) => {
                          return(
                            <Message key={message.id} message={message} userId={userId} botId={this.props.botId} client={this.state.client} />
                          )
                        })
                      }

                      {
                        messagesInFlight.map((message, index) => {
                          return(
                            <Message key={`message-inflight-${index}`} message={{ content: { body: message }}} placeholder={true} />
                          )
                        })
                      }

                      { typingStatus &&
                        <div className="notices">
                          <div role="status">{typingStatus}</div>
                        </div>
                      }

                      { Boolean(Object.keys(decryptionErrors).length) &&
                        <div className={`message from-bot`}>
                          <div className="text buttons">
                            {`Restart chat without encryption?`}
                            <button className="btn" id="accept" onClick={this.restartWithoutCrypto}>RESTART</button>
                          </div>
                        </div>
                      }

                      { !ready && <div className={`loader`}>loading...</div> }
                    </div>
                  </div>
                  <div className="input-window">
                    <form onSubmit={this.handleSubmit}>
                      <div className="message-input-container">
                        <input
                          id="message-input"
                          type="text"
                          onChange={this.handleInputChange}
                          value={inputValue}
                          aria-label={inputLabel}
                          placeholder={inputLabel}
                          autoFocus={true}
                          ref={this.chatboxInput}
                        />
                        {
                          (status === "entered") && !isMobile &&
                          <EmojiSelector
                            onEmojiClick={this.onEmojiClick}
                            emojiSelectorOpen={emojiSelectorOpen}
                            toggleEmojiSelector={this.toggleEmojiSelector}
                            closeEmojiSelector={this.closeEmojiSelector}
                          />
                        }
                      </div>
                      <input type="submit" value="Send" id="submit" onClick={this.handleSubmit} />
                    </form>
                  </div>
                </div>
              </div>
              )}
            }
          </Transition>
          {showDock && !roomId && <Dock handleToggleOpen={this.handleToggleOpen} size={this.props.size} />}
          {showDock && roomId && <Header handleToggleOpen={this.handleToggleOpen} opened={opened} handleExitChat={this.handleExitChat} />}
        </div>
      </div>
    );
  }
};

ChatBox.propTypes = {
  matrixServerUrl: PropTypes.string.isRequired,
  botId: PropTypes.string.isRequired,
  termsUrl: PropTypes.string,
  introMessage: PropTypes.string,
  roomName: PropTypes.string,
  agreementMessage: PropTypes.string,
  confirmationMessage: PropTypes.string,
  exitMessage: PropTypes.string,
  chatUnavailableMessage: PropTypes.string,
  anonymousDisplayName: PropTypes.string,
  waitMessage: PropTypes.string,
  chatOfflineMessage: PropTypes.string,
  isEncryptionDisabled: PropTypes.bool,
  position: PropTypes.oneOf(['top left', 'top right', 'bottom left', 'bottom right']),
  size: PropTypes.oneOf(['small', 'large']),
  maxWaitTime: PropTypes.number,
  waitInterval: PropTypes.number,
}

ChatBox.defaultProps = {
  matrixServerUrl: DEFAULT_MATRIX_SERVER,
  botId: DEFAULT_BOT_ID,
  termsUrl: DEFAULT_TERMS_URL,
  roomName: DEFAULT_ROOM_NAME,
  introMessage: DEFAULT_INTRO_MESSAGE,
  agreementMessage: DEFAULT_AGREEMENT_MESSAGE,
  confirmationMessage: DEFAULT_CONFIRMATION_MESSAGE,
  exitMessage: DEFAULT_EXIT_MESSAGE,
  anonymousDisplayName: DEFAULT_ANONYMOUS_DISPLAY_NAME,
  chatUnavailableMessage: DEFAULT_CHAT_UNAVAILABLE_MESSAGE,
  waitMessage: DEFAULT_WAIT_MESSAGE,
  chatOfflineMessage: DEFAULT_CHAT_OFFLINE_MESSAGE,
  isEncryptionDisabled: DEFAULT_ENCRYPTION_DISABLED,
  position: DEFAULT_POSITION,
  size: DEFAULT_SIZE,
  maxWaitTime: DEFAULT_MAX_WAIT_MS,
  waitInterval: DEFAULT_WAIT_INTERVAL_MS,
}

export default ChatBox;

