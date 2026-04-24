// এপিআই তথ্য
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
let API_KEY = ""; // ভার্সেলের এনভায়রনমেন্ট ভেরিয়েবল থেকে নেওয়া হবে

// ডম উপাদানগুলো নির্বাচন
const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const generatePromptBtn = document.getElementById("generatePromptBtn");
const promptType = document.getElementById("promptType");

// এপিআই কী লোড করা
window.addEventListener("load", async () => {
    try {
        const res = await fetch("/api/get-key");
        const data = await res.json();
        API_KEY = data.key;
    } catch (error) {
        chatBox.innerHTML = `<div class="welcome-message" style="color: #ef4444;">
            <h3>সতর্কবার্তা ⚠️</h3>
            <p>এপিআই কী পাওয়া যায়নি। অনুগ্রহ করে ভার্সেলের সেটিংসে গিয়ে এনভায়রনমেন্ট ভেরিয়েবল হিসেবে API_KEY যুক্ত করুন।</p>
        </div>`;
    }
});

// বার্তা পাঠানোর কাজ
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // ব্যবহারকারীর বার্তা দেখানো
    addMessageToChat("আপনি", message, "user-message");
    userInput.value = "";

    // নির্বাচিত এআই মডেলগুলো বের করা
    const selectedModels = Array.from(document.querySelectorAll('input[name="model"]:checked'))
        .map(checkbox => checkbox.value);

    if (selectedModels.length === 0) {
        addMessageToChat("বিজ্ঞপ্তি", "অনুগ্রহ করে অন্তত একটি এআই মডেল বেছে নিন।", "ai-message");
        return;
    }

    // প্রতিটি নির্বাচিত মডেলের জন্য অনুরোধ পাঠানো
    selectedModels.forEach(async (modelId) => {
        addLoadingMessage(modelId);

        try {
            const modelDetails = getModelDetails(modelId);
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.origin,
                    "X-Title": "মাল্টি এজেন্ট এআই চ্যাটবট"
                },
                body: JSON.stringify({
                    model: modelDetails.id,
                    messages: [{ role: "user", content: message }],
                    temperature: 0.7,
                    max_tokens: 1000
                })
            });

            const data = await response.json();
            removeLoadingMessage(modelId);
            
            if (data.choices && data.choices[0]) {
                addMessageToChat(modelDetails.name, data.choices[0].message.content, "ai-message");
            } else {
                addMessageToChat(modelDetails.name, "দুঃখিত, কোনো উত্তর পাওয়া যায়নি। আবার চেষ্টা করুন।", "ai-message");
            }
        } catch (error) {
            removeLoadingMessage(modelId);
            addMessageToChat(modelId, `ত্রুটি: ${error.message}`, "ai-message");
        }
    });
}

// মডেলের বিবরণ পাওয়া
function getModelDetails(id) {
    const models = {
        gemini: { id: "google/gemini-flash-1.5", name: "গুগল জেমিনি" },
        mistral: { id: "mistralai/mistral-7b-instruct", name: "মিস্ট্রাল এআই" },
        llama: { id: "meta-llama/llama-3-8b-instruct", name: "লামা ৩" },
        gpt: { id: "openai/gpt-3.5-turbo", name: "জিপিটি-৩.৫ টার্বো" }
    };
    return models[id] || { id: "", name: "অজানা মডেল" };
}

// চ্যাটে বার্তা যুক্ত করা
function addMessageToChat(sender, text, className) {
