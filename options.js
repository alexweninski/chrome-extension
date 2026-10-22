
//will retrieve list of blocked websites from local storage
chrome.storage.local.get(['restrictedWebsites'], (result) => {

    const websites = result.restrictedWebsites || [];

    console.log("Restricted Websites:" + websites);


    const tableBody = document.getElementById("website-table-body");
    //will populate table based off websites

    //if website list does not exist in storage display no websites
    if (websites.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = "<td>There are no restricted websites yet</td>"
        tableBody.appendChild(row);
    }

    //if website list does exist render table
    else {
        websites.forEach((e, i) => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${e}</td><td><button class="delete-btn" data-index=${i}>&#x2715;</button></td>`;
            tableBody.appendChild(row);
        });
    }

});

//add a listener to the table to enable delete buttons
document.getElementById('website-table').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const index = e.target.dataset.index;

        chrome.storage.local.get(['restrictedWebsites'], (result) => {
            const websites = result.restrictedWebsites || [];

            websites.splice(index);
            chrome.storage.local.set({ restrictedWebsites: websites });
            window.location.reload();
        })
    }
});

//adds a listener to website adding button
document.getElementById("add-website-button").addEventListener("click", () => {

    const inputData = document.getElementById("restricted-website-input").value;

    chrome.storage.local.get(['restrictedWebsites'], (result) => {

        const websites = result.restrictedWebsites || [];

        //appends websites and saves to storage if exists
        if (websites.length !== 0) {
            websites.push(inputData);
            chrome.storage.local.set({ restrictedWebsites: websites });
        }
        //just adds the value in input if nothing exists already
        else {
            chrome.storage.local.set({ restrictedWebsites: [inputData] })
        }
        window.location.reload();
    })

})

//adds a listener to the clear list button
document.getElementById("clear-list-button").addEventListener("click", () => {
    chrome.storage.local.remove("restrictedWebsites", () => {
        console.log('restricted website list has been cleared');
        window.location.reload();
    });
})

//adds a listener to save-btn that will update openAi API key
document.getElementById("save-btn").addEventListener("click", () => {
    const apiKey = document.getElementById("api-key-input").value;

    //sets OpenAi Api key and displays status
    chrome.storage.local.set({ openAiAPIKey: apiKey }, () => {
        document.getElementById("status").innerText = "Key saved successfully!";
        setTimeout(() => { document.getElementById("status").innerText = "" }, 2000)
    })
})



