const STORAGE_KEY = "duckyopensource.chats.v1";
const CHAT_LIMIT = 35;
const welcome = document.querySelector("#welcome");
const messagesRoot = document.querySelector("#messages");
const messageScroll = document.querySelector("#message-scroll");
const form = document.querySelector("#chat-form");
const input = document.querySelector("#chat-input");
const modelSelect = document.querySelector("#model-select");
const searchToggle = document.querySelector("#search-toggle");
const sendButton = document.querySelector("#send-button");
const stopButton = document.querySelector("#stop-button");
const toast = document.querySelector("#toast");
const imagePanel = document.querySelector("#image-panel");
const imagePrompt = document.querySelector("#image-prompt");
const serviceButton = document.querySelector("#service-button");
let state = loadState();
let activeChatId = state.activeChatId;
let activeController = null;
let toastTimer;

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const chats = Array.isArray(parsed.chats) ? parsed.chats.filter((chat) =>
      chat && typeof chat.id === "string" && Array.isArray(chat.messages),
    ) : [];
    return { chats: chats.slice(0, CHAT_LIMIT), activeChatId: parsed.activeChatId ?? null };
  } catch {
    return { chats: [], activeChatId: null };
  }
}

function persist() {
  state.chats = state.chats.slice(0, CHAT_LIMIT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ chats: state.chats, activeChatId }));
  } catch {
    notify("Browser storage is full. Clear old chats to keep saving conversations.");
  }
  renderConversationList();
}

function currentChat() {
  return state.chats.find((chat) => chat.id === activeChatId) ?? null;
}

function createChat() {
  const chat = { id: crypto.randomUUID(), title: "New chat", updatedAt: Date.now(), messages: [] };
  state.chats.unshift(chat);
  activeChatId = chat.id;
  renderConversation();
  persist();
  input.focus();
}

function activateChat(id) {
  activeChatId = id;
  renderConversation();
  persist();
}

function renderConversationList() {
  const nav = document.querySelector("#conversation-list");
  nav.replaceChildren();
  for (const chat of state.chats.slice(0, CHAT_LIMIT)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `conversation-item${chat.id === activeChatId ? " active" : ""}`;
    button.title = chat.title;
    button.innerHTML = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3.5h10v7H8l-3.5 2v-2H3v-7Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    const title = document.createElement("span");
    title.textContent = chat.title || "New chat";
    button.append(title);
    button.addEventListener("click", () => activateChat(chat.id));
    nav.append(button);
  }
}

function duckAvatar() {
  const avatar = document.createElement("span");
  avatar.className = "message-avatar";
  avatar.innerHTML = '<svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 5.5c-8.3 0-14.5 6.2-14.5 14.4 0 7.8 3.7 12.3 8.4 14.6l-.5 5.9h13.2l-.5-5.9c4.7-2.3 8.4-6.8 8.4-14.6C38.5 11.7 32.3 5.5 24 5.5Z" fill="currentColor"/><path d="M10.6 20.2c-2.9.3-5.4 1.7-5.4 4.2 0 2.4 2.3 3.7 7 3.5" fill="#fff" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="28.5" cy="18" r="1.7" fill="#fff"/></svg>';
  return avatar;
}

function renderInline(parent, text) {
  const pattern = /(`[^`\n]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parent.append(document.createTextNode(text.slice(cursor, index)));
    const token = match[0];
    const element = token.startsWith("`") ? document.createElement("code")
      : token.startsWith("**") ? document.createElement("strong")
        : document.createElement("em");
    element.textContent = token.startsWith("`") ? token.slice(1, -1)
      : token.startsWith("**") ? token.slice(2, -2) : token.slice(1, -1);
    parent.append(element);
    cursor = index + token.length;
  }
  if (cursor < text.length) parent.append(document.createTextNode(text.slice(cursor)));
}

function appendText(parent, text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let paragraph = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    const p = document.createElement("p");
    paragraph.forEach((line, index) => {
      if (index) p.append(document.createElement("br"));
      renderInline(p, line);
    });
    parent.append(p);
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = line.match(/^```([\w.+-]*)\s*$/);
    if (fence) {
      flushParagraph();
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) codeLines.push(lines[index++]);
      const card = document.createElement("div");
      card.className = "code-card";
      const header = document.createElement("div");
      header.className = "code-card-header";
      const language = document.createElement("span");
      language.textContent = fence[1] || "code";
      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "copy-code";
      copy.textContent = "Copy";
      const codeText = codeLines.join("\n");
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(codeText);
          copy.textContent = "Copied";
          setTimeout(() => { copy.textContent = "Copy"; }, 1200);
        } catch {
          notify("Clipboard permission was not available.");
        }
      });
      header.append(language, copy);
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = codeText;
      pre.append(code);
      card.append(header, pre);
      parent.append(card);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const h = document.createElement("h3");
      renderInline(h, heading[1]);
      parent.append(h);
      continue;
    }
    const listItem = line.match(/^\s*[-*]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      let list = parent.lastElementChild;
      if (!list || list.tagName !== "UL") {
        list = document.createElement("ul");
        parent.append(list);
      }
      const li = document.createElement("li");
      renderInline(li, listItem[1]);
      list.append(li);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
}

function renderMessage(message, { pending = false } = {}) {
  const row = document.createElement("article");
  row.className = "message-row";
  row.dataset.messageId = message.id;
  if (message.role === "assistant") {
    row.append(duckAvatar());
  } else {
    const avatar = document.createElement("span");
    avatar.className = "message-avatar user-avatar";
    avatar.textContent = "YOU";
    row.append(avatar);
  }

  const content = document.createElement("div");
  content.className = "message-content";
  const meta = document.createElement("div");
  meta.className = "message-meta";
  const author = document.createElement("strong");
  author.textContent = message.role === "assistant" ? "Ducky" : "You";
  const time = document.createElement("span");
  time.textContent = new Date(message.createdAt ?? Date.now()).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  meta.append(author, time);

  const text = document.createElement("div");
  text.className = `message-text${message.error ? " message-error" : ""}`;
  if (message.content) appendText(text, message.content);
  else if (pending) {
    text.innerHTML = '<span class="typing-dots" aria-label="Ducky is thinking"><i></i><i></i><i></i></span>';
  }
  content.append(meta, text);
  if (Array.isArray(message.sources) && message.sources.length) content.append(renderSources(message.sources));
  if (message.imageUrl) {
    const image = document.createElement("img");
    image.className = "generated-image";
    image.src = message.imageUrl;
    image.alt = message.imageAlt || "Image generated locally with ComfyUI";
    image.loading = "lazy";
    content.append(image);
  }
  if (message.progress) {
    const progress = document.createElement("div");
    progress.className = "image-progress";
    progress.textContent = message.progress;
    content.append(progress);
  }
  row.append(content);
  return row;
}

function renderSources(sources) {
  const list = document.createElement("div");
  list.className = "source-list";
  const heading = document.createElement("div");
  heading.className = "source-heading";
  heading.textContent = "Search sources";
  list.append(heading);
  for (const [index, source] of sources.entries()) {
    const link = document.createElement("a");
    link.className = "source-link";
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `[${index + 1}] ${source.title}`;
    list.append(link);
  }
  return list;
}

function renderConversation() {
  const chat = currentChat();
  welcome.hidden = Boolean(chat?.messages.length);
  messagesRoot.replaceChildren();
  if (chat) {
    for (const message of chat.messages) messagesRoot.append(renderMessage(message));
  }
  renderConversationList();
  scrollToBottom(false);
}

function scrollToBottom(smooth = true) {
  messageScroll.scrollTo({ top: messageScroll.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}

function makeChatIfNeeded() {
  let chat = currentChat();
  if (!chat) {
    chat = { id: crypto.randomUUID(), title: "New chat", updatedAt: Date.now(), messages: [] };
    state.chats.unshift(chat);
    activeChatId = chat.id;
  }
  return chat;
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3200);
}

async function loadModels() {
  modelSelect.replaceChildren(new Option("No models", ""));
  modelSelect.disabled = true;
  try {
    const response = await fetch("/api/models");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ollama is not available.");
    if (data.status === "offline") {
      modelSelect.replaceChildren(new Option("Ollama offline", ""));
      return;
    }
    modelSelect.replaceChildren();
    for (const model of data.models) modelSelect.add(new Option(model.name, model.name));
    if (!data.models.length) {
      modelSelect.add(new Option("Install a model", ""));
      notify("Ollama is running, but no local models are installed. See the README.");
    } else {
      const preferred = data.models.find((model) => model.name === data.defaultModel);
      modelSelect.value = preferred?.name ?? data.models[0].name;
      modelSelect.disabled = false;
    }
  } catch (error) {
    modelSelect.replaceChildren(new Option("Ollama offline", ""));
    notify(error.message);
  }
}

function setBusy(busy) {
  sendButton.hidden = busy;
  stopButton.hidden = !busy;
  sendButton.disabled = busy;
}

async function parseEventStream(response, onEvent) {
  if (!response.body) throw new Error("The server did not return a response stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const lines = frame.split(/\r?\n/);
      const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() ?? "message";
      const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
      if (data) onEvent(event, JSON.parse(data));
    }
    if (done) break;
  }
  if (buffer.trim()) {
    const data = buffer.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
    const event = buffer.split(/\r?\n/).find((line) => line.startsWith("event:"))?.slice(6).trim() ?? "message";
    if (data) onEvent(event, JSON.parse(data));
  }
}

async function sendMessage(text = input.value) {
  const content = text.trim();
  if (!content || activeController) return;
  if (!modelSelect.value) {
    notify("Install a local Ollama model before sending a message.");
    return;
  }
  const chat = makeChatIfNeeded();
  const userMessage = { id: crypto.randomUUID(), role: "user", content, createdAt: Date.now() };
  chat.messages.push(userMessage);
  if (chat.title === "New chat") chat.title = content.slice(0, 38) + (content.length > 38 ? "…" : "");
  const assistant = { id: crypto.randomUUID(), role: "assistant", content: "", createdAt: Date.now() };
  chat.messages.push(assistant);
  input.value = "";
  input.style.height = "auto";
  welcome.hidden = true;
  messagesRoot.replaceChildren(...chat.messages.map((message) =>
    renderMessage(message, { pending: message.id === assistant.id }),
  ));
  persist();
  setBusy(true);
  activeController = new AbortController();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelSelect.value,
        messages: chat.messages
          .filter((message) => message.id !== assistant.id
            && ["user", "assistant"].includes(message.role)
            && typeof message.content === "string"
            && message.content.trim())
          .slice(-40)
          .map(({ role, content }) => ({ role, content })),
        webSearch: searchToggle.checked,
      }),
      signal: activeController.signal,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Request failed with status ${response.status}.`);
    }
    await parseEventStream(response, (event, data) => {
      if (event === "sources") assistant.sources = data.sources ?? [];
      if (event === "token") assistant.content += data.text ?? "";
      if (event === "error") {
        assistant.content = data.error ?? "The local model returned an error.";
        assistant.error = true;
      }
      if (event === "done") assistant.error = false;
      const oldRow = messagesRoot.querySelector(`[data-message-id="${assistant.id}"]`);
      const newRow = renderMessage(assistant, { pending: !assistant.content && !assistant.error });
      if (oldRow) oldRow.replaceWith(newRow);
      else messagesRoot.append(newRow);
      chat.updatedAt = Date.now();
      persist();
      scrollToBottom();
    });
    if (!assistant.content && !assistant.error) {
      assistant.content = "The model returned an empty answer.";
      assistant.error = true;
    }
  } catch (error) {
    assistant.content = error.name === "AbortError" ? "Response stopped." : error.message;
    assistant.error = true;
    const oldRow = messagesRoot.querySelector(`[data-message-id="${assistant.id}"]`);
    if (oldRow) oldRow.replaceWith(renderMessage(assistant));
  } finally {
    activeController = null;
    setBusy(false);
    chat.updatedAt = Date.now();
    persist();
    scrollToBottom();
  }
}

async function generateImage() {
  const prompt = imagePrompt.value.trim();
  if (!prompt) {
    notify("Describe the image you want to make.");
    imagePrompt.focus();
    return;
  }
  const chat = makeChatIfNeeded();
  const userMessage = { id: crypto.randomUUID(), role: "user", content: `Make an image: ${prompt}`, createdAt: Date.now() };
  const imageMessage = { id: crypto.randomUUID(), role: "assistant", content: "", createdAt: Date.now(), progress: "Sending your prompt to local ComfyUI…" };
  chat.messages.push(userMessage, imageMessage);
  if (chat.title === "New chat") chat.title = `Image: ${prompt.slice(0, 28)}${prompt.length > 28 ? "…" : ""}`;
  welcome.hidden = true;
  messagesRoot.replaceChildren(...chat.messages.map((message) => renderMessage(message)));
  persist();
  document.querySelector("#generate-image").disabled = true;
  try {
    const size = Number(document.querySelector("#image-size").value);
    const response = await fetch("/api/images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, width: size, height: size }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not start local image generation.");
    imageMessage.progress = "Generating locally. This can take a few minutes…";
    renderConversation();

    for (let attempt = 0; attempt < 300; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusResponse = await fetch(`/api/images/${encodeURIComponent(data.promptId)}`);
      const status = await statusResponse.json();
      if (!statusResponse.ok) throw new Error(status.error || "Could not check image generation.");
      if (status.status === "error") throw new Error(status.error);
      if (status.status === "complete") {
        imageMessage.progress = "";
        imageMessage.imageUrl = status.imageUrl;
        imageMessage.imageAlt = prompt;
        persist();
        renderConversation();
        return;
      }
    }
    throw new Error("Image generation is taking too long. Check the ComfyUI window for status.");
  } catch (error) {
    imageMessage.progress = "";
    imageMessage.content = error.message;
    imageMessage.error = true;
    persist();
    renderConversation();
  } finally {
    document.querySelector("#generate-image").disabled = false;
  }
}

async function checkServices() {
  try {
    const response = await fetch("/api/status");
    const data = await response.json();
    const available = [data.chat, data.search, data.images].filter((value) => value === "connected").length;
    const total = 3;
    const names = [
      data.chat === "connected" ? "chat ready" : "chat offline",
      data.search === "connected" ? "search ready" : "search offline",
      data.images === "connected" ? "images ready" : "images offline",
    ];
    document.querySelector("#service-label").textContent = `${available}/${total} services ready`;
    serviceButton.classList.toggle("offline", available === 0);
    serviceButton.classList.toggle("partial", available > 0 && available < 3);
    serviceButton.title = names.join(", ");
  } catch {
    document.querySelector("#service-label").textContent = "Could not check local services";
    serviceButton.classList.add("offline");
  }
}

document.querySelector("#new-chat").addEventListener("click", createChat);
document.querySelector("#suggestions").addEventListener("click", (event) => {
  const button = event.target.closest("[data-prompt]");
  if (button) sendMessage(button.dataset.prompt);
});
document.querySelector("#open-image-panel").addEventListener("click", () => {
  imagePanel.hidden = !imagePanel.hidden;
  if (!imagePanel.hidden) imagePrompt.focus();
});
document.querySelector("#close-image-panel").addEventListener("click", () => { imagePanel.hidden = true; });
document.querySelector("#generate-image").addEventListener("click", generateImage);
document.querySelector("#service-button").addEventListener("click", () => { checkServices(); loadModels(); });
form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});
input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});
stopButton.addEventListener("click", () => activeController?.abort());
document.querySelector("#search-toggle").addEventListener("change", () => {
  if (searchToggle.checked) notify("Search sends your question to your configured SearXNG instance and its enabled search engines.");
});
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    createChat();
  }
});

if (!state.chats.some((chat) => chat.id === activeChatId)) activeChatId = state.chats[0]?.id ?? null;
renderConversation();
loadModels();
checkServices();
setInterval(checkServices, 20000);
