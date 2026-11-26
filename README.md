DuckyOpenSource
A local-first AI chat codebase. It connects to open models and services running on your own computer:

Chat: Ollama
Web search: your own SearXNG instance
Optional image generation: ComfyUI with a compatible local checkpoint such as SDXL Base 1.0
There are no paid API keys, accounts, hosted inference calls, or Ducky cloud service. Chat and image inference happen locally. Search requests go to the search engines enabled in your SearXNG configuration, so those engines receive the search query.

GitHub stores and versions this source code. GitHub Pages is static hosting and does not run Ollama, SearXNG, or ComfyUI. To keep inference free of cloud bills, clone this repository and run it on your own computer. The software is free; model downloads use disk space, and inference uses your computer's memory, processor, and usually a GPU for practical image generation.

Requirements
Node.js 20.12 or newer
Ollama installed locally for chat
Optional: SearXNG installed locally for search
Optional: ComfyUI and a compatible image checkpoint for image generation
Run the chat
Install Ollama.

Download one local model. For example:

ollama pull qwen3:4b
The model is downloaded to your machine. Its size and speed depend on the model and your hardware. You can use another model installed in Ollama; DuckyOpenSource lists the available local models in the chat selector.

Start Ollama, then open a terminal in this directory:

cp .env.example .env
npm start
On Windows, copy .env.example to .env using File Explorer or:

Copy-Item .env.example .env
Open http://127.0.0.1:4178.

No npm install is required; this project uses Node's built-in modules and has no npm dependencies.

Enable web search
Install and run SearXNG on your computer. The official container setup requires Docker or Podman; SearXNG is optional if you only want local chat.
In SearXNG's settings.yml, enable the JSON response format under search.formats (keep the existing HTML format too). The SearXNG API returns 403 when JSON output is disabled.
Set SEARXNG_URL in .env to your local instance, such as http://127.0.0.1:8080.
Restart DuckyOpenSource and turn on Web search before sending a question.
SearXNG can query third-party search engines. Check which engines are enabled in your instance: those providers receive your search query. DuckyOpenSource does not use a paid search API or silently substitute another service.

Enable local image generation
Image generation is optional and requires local hardware capable of running the model. It is not included as a hosted free service.

Install ComfyUI and start its local server at http://127.0.0.1:8188.
Download a compatible checkpoint, for example Stable Diffusion XL Base 1.0, and place it in ComfyUI's models/checkpoints/ directory.
Read and follow that model's CreativeML Open RAIL++-M license. The license contains use restrictions; “free to download” does not mean unrestricted use.
Set COMFYUI_CHECKPOINT in .env to the exact checkpoint filename, then restart DuckyOpenSource.
Use the Image button in the chat composer.
The model weights are not included in this repository. ComfyUI and the model have their own installation requirements, hardware needs, and licenses. Image requests fail visibly if ComfyUI or the checkpoint is unavailable.

Configuration
Copy .env.example to .env and edit the local addresses if needed:

Setting	Default	Purpose
HOST	127.0.0.1	Local-only bind address. Do not expose the server to the internet.
PORT	4178	Web interface and local service bridge
OLLAMA_URL	http://127.0.0.1:11434	Ollama API on this computer
OLLAMA_DEFAULT_MODEL	qwen3:4b	Preferred installed model
SEARXNG_URL	http://127.0.0.1:8080	Optional local SearXNG instance
COMFYUI_URL	http://127.0.0.1:8188	Optional local ComfyUI instance
COMFYUI_CHECKPOINT	sd_xl_base_1.0.safetensors	Checkpoint filename in ComfyUI
Keep HOST=127.0.0.1 for normal use. The local server intentionally rejects non-local browser hosts and does not provide accounts, authentication, or remote hosting.

Privacy and limitations
Chat history is stored in your browser's local storage; it is not uploaded by this code.
Ollama receives chat messages over your local machine's network interface.
ComfyUI receives image prompts locally.
SearXNG receives search prompts locally, then sends requests to the engines enabled in your SearXNG instance.
Models can make mistakes. Web search may be unavailable if your SearXNG instance is down or blocks JSON responses.
There is no cloud fallback. When a local service is offline, DuckyOpenSource reports that instead of switching to a paid model.
The default server binds to loopback. Do not change it to a public interface or expose its ports.
Development and tests
npm test
npm run dev
Tests use fake local services and do not require AI model downloads.

License
This repository does not yet declare a license for the DuckyOpenSource code. Choose and add a code license before publishing it as open source. Model and service licenses remain separate and must be followed independently.

Official references
Ollama local API
SearXNG Search API
ComfyUI API overview
GitHub Pages is static hosting
