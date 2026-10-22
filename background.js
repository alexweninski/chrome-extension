chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "callOpenAI") { // FIXED: use '===' instead of '='

        // Wrap the async logic in an IIFE (Immediately Invoked Async Function Expression)
        (async () => {
            const website = request.data.website;
            const justification = request.data.justification;
            const requested_time = request.data.requested_time;

            // 1. MUST AWAIT the async function!
            const aiResponse = await callOpenAI(website, justification, requested_time);

            // 2. Safely extract time_period (fallback to 0 if undefined)
            const approvedMinutes = aiResponse.time_period || 0;

            // 3. Calculate expiration timestamp
            const currentTime = Date.now();
            const timeToAddMs = approvedMinutes * 60 * 1000;
            const expirationTime = currentTime + timeToAddMs;

            // 4. Send the resolved data back to content.js
            sendResponse({
                approved: aiResponse.approved,
                until: expirationTime
            });
        })();

        // Return true to tell Chrome we will respond asynchronously
        return true;
    }
});

async function callOpenAI(website, justification, requested_time) {
    const sys_prompt = `You are an AI mindfulness and productivity coach that acts as a strict screen-time gatekeeper. 
Users must submit a justification and a requested time frame before accessing restricted websites (e.g., YouTube, Instagram).

Your evaluation criteria:
- APPROVE productive, educational, or necessary professional/personal tasks. Adjust the approved time_period to match a realistic timeframe for the task.
- DENY vague, lazy, or pure boredom-driven justifications (e.g., "just checking", "bored"). If denied, set time_period to 0.
- If granting leisure time, be conservative (e.g., limit casual scrolling to 5-15 minutes max, even if they asked for more).

You MUST respond ONLY with a valid JSON object in the exact following format, with no markdown code blocks or extra text:
{
  "approved": true,
  "time_period": 10,
  "justification": "Give justification here"
}`

    const url = "https://api.openai.com/v1/chat/completions";


    const result = await chrome.storage.local.get(['openAiAPIKey']);
    const apiKey = result.openAiAPIKey;

    if (!apiKey) {
        console.error("No API key found");
        return { approved: true, time_period: 0 };
    }


    const userPromptText = JSON.stringify({
        website: website,
        justification: justification,
        requested_time: requested_time
    });

    const payload = {
        model: "gpt-4o",
        messages: [
            { role: "system", content: sys_prompt },
            { role: "user", content: userPromptText }
        ]
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${response.status} ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const aiResponseText = JSON.parse(data.choices[0].message.content.trim());
        console.log(aiResponseText);

        // TODO: Parse aiResponseText to extract approved and time_period and return them!
        return aiResponseText;

    } catch (error) {
        console.error("OpenAI call failed:", error);
        return { approved: false, time_period: 0 };
    }
}