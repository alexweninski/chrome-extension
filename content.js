// Check storage and URL restrictions when the page loads
chrome.storage.local.get(['restrictedWebsites', 'unblocked_until'], (result) => {
  const unblocked_until = result.unblocked_until || null;
  const websites = result.restrictedWebsites || [];
  const currentUrl = window.location.href;

  const isRestrictedSite = websites.some(site => currentUrl.includes(site));
  const temporarilyUnblocked = unblocked_until && Date.now() < unblocked_until;

  if (isRestrictedSite && !temporarilyUnblocked) {
    triggerBlocker();
  }
});

function triggerBlocker() {
  // 1. Create a host container for the Shadow DOM
  const host = document.createElement("div");
  host.id = "mindful-blocker-host";

  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.width = "100vw";
  host.style.height = "100vh";
  host.style.zIndex = "999999";

  // 2. Attach an open Shadow Root for style isolation
  const shadowRoot = host.attachShadow({ mode: "open" });

  // 3. Inject your HTML template with updated, modern CSS
  const htmlText = `
    <style>
        .overlay-wrapper {
            width: 100vw;
            height: 100vh;
            background-color: rgba(10, 10, 12, 0.9);
            backdrop-filter: blur(8px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #f3f4f6;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .modal-box {
            background: #18181b;
            border: 1px solid #27272a;
            padding: 35px 40px;
            border-radius: 16px;
            text-align: center;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
        }

        h2 {
            margin-top: 0;
            margin-bottom: 8px;
            font-size: 24px;
            color: #ffffff;
            font-weight: 600;
        }

        p {
            color: #a1a1aa;
            font-size: 14px;
            margin-bottom: 24px;
        }

        label {
            display: block;
            text-align: left;
            margin-top: 14px;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 500;
            color: #d4d4d8;
        }

        input[type="text"], input[type="number"] {
            width: 100%;
            padding: 12px 14px;
            box-sizing: border-box;
            border-radius: 8px;
            border: 1px solid #3f3f46;
            background: #09090b;
            color: #f4f4f5;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        input[type="text"]:focus, input[type="number"]:focus {
            border-color: #22c55e;
            box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
        }

        button {
            width: 100%;
            padding: 12px 20px;
            background: #22c55e;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            margin-top: 24px;
            transition: background-color 0.2s, transform 0.1s;
        }

        button:hover {
            background: #16a34a;
        }

        button:active {
            transform: scale(0.98);
        }

        #status {
            margin-top: 18px;
            font-size: 14px;
            font-weight: 500;
            min-height: 20px;
        }
    </style>

    <div class="overlay-wrapper">
        <div class="modal-box">
            <h2>Hey, hold on a second...</h2>
            <p>What are you doing here?</p>

            <label for="justification">Reasoning</label>
            <input type="text" id="justification" placeholder="Enter your reasoning here">

            <label for="time-requested">Break Length (minutes)</label>
            <input type="number" id="time-requested" min="5" max="120" step="5" value="10">
            
            <button id="submission">Submit Reasoning</button>
            <div id="status"></div>
        </div>
    </div>
  `;

  shadowRoot.innerHTML = htmlText;
  document.body.appendChild(host);

  // 4. Hook up the submission button event listener
  const submitButton = shadowRoot.getElementById("submission");
  if (submitButton) {
    submitButton.addEventListener("click", () => {
      const reasoning = shadowRoot.getElementById('justification').value;
      const breakLength = shadowRoot.getElementById('time-requested').value;
      const statusEl = shadowRoot.getElementById('status');

      if (!reasoning.trim()) {
        if (statusEl) {
          statusEl.style.color = "#f87171";
          statusEl.textContent = "Please enter a valid reason.";
        }
        return;
      }

      if (statusEl) {
        statusEl.style.color = "#fbbf24";
        statusEl.textContent = "Evaluating reasoning...";
      }

      // Send the data to background.js
      chrome.runtime.sendMessage(
        {
          action: "callOpenAI",
          data: {
            website: window.location.href,
            justification: reasoning,
            requested_time: breakLength
          }
        },
        (response) => {
          if (!response) {
            if (statusEl) {
              statusEl.style.color = "#f87171";
              statusEl.textContent = "Error: No response received.";
            }
            return;
          }

          const approved = response.approved;
          const unblocked_until = response.until;

          if (approved) {
            if (statusEl) {
              statusEl.style.color = "#4ade80";
              statusEl.textContent = `Approved until ${new Date(unblocked_until).toLocaleTimeString()}`;
            }

            chrome.storage.local.set({ unblocked_until: unblocked_until }, () => {
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            });
          } else {
            if (statusEl) {
              statusEl.style.color = "#f87171";
              statusEl.textContent = `DENIED. Get back to work!`;
            }
          }
        }
      );
    });
  }
}