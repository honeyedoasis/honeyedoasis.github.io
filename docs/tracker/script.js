// --- YOUR PROVIDED FUNCTIONS ---
const MEMBER_MAP = {
    SR: 'Saerom', HY: 'Hayoung', GY: 'Gyuri', JW: 'Jiwon', JS: 'Jisun',
    SY: 'Seoyeon', CY: 'Chaeyoung', NG: 'Nagyung', JH: 'Jiheon'
};

const headers = [
    "Website",
    "Date",
    "Channel",
    "Eng Title",
    "Members",
    "Category",
    "Official Link",
    "Eng Sub",
    "Other Link",
    "Twitter",
    "Kor Title"
]

const STYLES = {
    listContainer: "margin: 0; padding-left: 24px;",
    listItem: "list-style-type: square; font-size: 11pt; font-family: Arial, sans-serif; color: #000; margin-bottom: 0;",
    baseText: "font-family: 'Lato', sans-serif; color: #212121;",
    boldText: "font-family: 'Lato', sans-serif; color: #212121; font-weight: bold;",
    linkWrapper: "text-decoration: none;",
    linkText: "font-family: 'Lato', sans-serif; color: #000000; text-decoration: underline;",
    codeText: "font-family: 'docs-Source Code Pro', 'Source Code Pro', Consolas, monospace; color: #212121;"
};

function generateSitesListHTML(itemsList) {
    let html = `<ul style="${STYLES.listContainer}">\n`;
    let plainText = "";

    itemsList.forEach((item, index) => {
        const emoji = item.subbed ? '✔️' : '❌';

        html += `<li style="${STYLES.listItem}">`;
        html += `<span style="${STYLES.baseText}">${emoji} ${item.date} . </span>`;

        if (item.prefix) {
            const prefixStyle = item.isPrefixBold ? STYLES.boldText : STYLES.baseText;
            html += `<span style="${prefixStyle}">${item.prefix}</span><span style="${STYLES.baseText}"> - </span>`;
        }

        if (item.title)
        {
            html += `<span style="${STYLES.baseText}">${item.title}</span><span style="${STYLES.baseText}"> - </span>`;
        }

        if (item.urls && item.urls.length > 0) {
            const urlHTMLArray = item.urls.map(link => {
                if (link.url) {
                    const currentLinkStyle = link.italics ? `${STYLES.linkText} font-style: italic;` : STYLES.linkText;
                    // Escape HTML characters in names to prevent XSS/broken formatting
                    return `<a href="${link.url}" style="${STYLES.linkWrapper}"><span style="${currentLinkStyle}">${link.name}</span></a>`;
                } else {
                    // If there is no URL (e.g. an unlinked title), just print it as regular text
                    return `<span style="${STYLES.baseText}">${link.name}</span>`;
                }
            });
            html += urlHTMLArray.join(`<span style="${STYLES.baseText}"> | </span>`);
        }

        if (item.suffix) {
            html += `<span style="${STYLES.baseText}"> - </span><span style="${STYLES.codeText}">${item.suffix}</span>`;
        }

        html += `</li>\n`;

        let linePlain = `▪ ${emoji} ${item.date} . `;
        if (item.prefix) linePlain += `${item.prefix} - `;
        if (item.urls) linePlain += item.urls.map(link => link.name).join(' | ');
        if (item.suffix) linePlain += ` - ${item.suffix}`;

        plainText += linePlain;
        if (index < itemsList.length - 1) plainText += '\n';
    });

    html += `</ul>`;
    return { html, plainText };
}

async function NEW_copyOutputToClipboard2() {
    const copyButton = document.getElementById('copyButton');

    try {
        const sheetHtml = await getHtmlFromClipboard();
        if (sheetHtml) {
            const parsedRows = parseGoogleSheetHtml(sheetHtml);

            // Step 1: Group rows by category
            const groupedRows = {};
            parsedRows.forEach(rowData => {
                if (rowData.length < 4 || (!rowData[1] && !rowData[2])) return;

                const category = rowData[3] || 'Uncategorized';
                if (!groupedRows[category]) {
                    groupedRows[category] = [];
                }
                groupedRows[category].push(rowData);
            });

            // Step 2: Build the final HTML per category group
            const finalHtmlParts = [];
            const finalPlainParts = [];

            for (const category in groupedRows) {
                const rowsForCategory = groupedRows[category];

                // Convert sheet rows into our new dictionary format
                const dictList = rowsForCategory
                    .map(rowData => NEW_formatRowData(rowData))
                    .filter(item => item !== null); // Filter out invalid rows

                if (dictList.length > 0) {
                    // If you ever want the Category Header back, uncomment this:
                    // finalHtmlParts.push(`<h3 class="category-header">${escapeHtml(category)}</h3>`);

                    // Generate the <ul> block for this specific category
                    const generatedBlock = generateSitesListHTML(dictList);
                    finalHtmlParts.push(generatedBlock.html);
                    finalPlainParts.push(generatedBlock.plainText);
                }
            }

            if (finalHtmlParts.length > 0) {
                // Join categories with a break
                const htmlToCopy = finalHtmlParts.join('<br>');
                const textToCopy = finalPlainParts.join('\n\n');

                if (typeof resultContainer !== 'undefined') resultContainer.style.display = 'block';

                const htmlBlob = new Blob([htmlToCopy], { type: 'text/html' });
                const textBlob = new Blob([textToCopy], { type: 'text/plain' });
                const clipboardItem = new ClipboardItem({
                    'text/html': htmlBlob,
                    'text/plain': textBlob,
                });

                await navigator.clipboard.write([clipboardItem]);

                // Feedback
                if (copyButton) {
                    const originalText = copyButton.textContent;
                    copyButton.textContent = 'Copied!';
                    copyButton.disabled = true;
                    setTimeout(() => {
                        copyButton.textContent = originalText;
                        copyButton.disabled = false;
                    }, 2000);
                }
            } else {
                alert("Could not find any valid data rows to format.");
            }
        }
    } catch (err) {
        console.error('Failed to copy content: ', err);
        alert('Could not copy to clipboard. Your browser might not support this feature or you may need to grant permission.');
    }
}

function normalize(str) {
    try {
        return decodeURIComponent(str)
            .trim()
            .replace(/['"]/g, ""); // optional: ignore quotes
    } catch {
        return str.trim();
    }
}

function isNamedUrl(link) {
    if (!link || typeof link !== "object") return false;

    const text = normalize(link.text || "");
    const url = normalize(link.url || "");

    if (!text || !url) return false;

    return text !== url;
}

function makeUrl(name, url)
{
    console.log(url.url);

    let italics = false;
    if (isNamedUrl(url))
    {
        console.log('found named url');
        console.log(url.url);
        console.log(url.text)
        name = url.text;
    }
    else if (url.url.includes('yout') && url.url.includes('?search_query='))
    {
        console.log('found yt search')
        name = 'YouTube Search';
        italics = true;
    }

    return { name: name, url: url.url, italics: italics };
}

function parseLinkArray(links, out_urls, single_name, multi_name)
{
    console.log('Parsing links', single_name, multi_name);
    console.log(links);
    if (links.length === 1)
    {
        console.log('single link');
        out_urls.push(makeUrl(single_name, links[0]));
    }
    else
    {
        for (let i = 0; i < links.length; i++)
        {
            let name = `${multi_name} ${i + 1}`
            out_urls.push(makeUrl(name, links[i]))
        }
    }
}

function NEW_formatRowData(rowData) {
    if (rowData.length < 9 || (!rowData[1] && !rowData[2])) return null;

    const date = rowData[headers.indexOf('Date')] || '';
    const title = rowData[headers.indexOf('Eng Title')];
    const sourceLinks = Array.isArray(rowData[headers.indexOf('Official Link')]) ? rowData[headers.indexOf('Official Link')] : [];
    const subLinks = Array.isArray(rowData[headers.indexOf('Eng Sub')]) ? rowData[headers.indexOf('Eng Sub')] : [];
    const otherLinks = Array.isArray(rowData[headers.indexOf('Other Link')]) ? rowData[headers.indexOf('Other Link')] : [];
    const prefix = rowData[headers.indexOf('Channel')];
    const initials = rowData[headers.indexOf('Members')];

    // 1. Determine Subbed Status
    const hasSub = subLinks && subLinks.length > 0 && subLinks !== 'None';

    // 2. Determine Prefix
    let finalPrefix = null;
    if ((typeof shouldShowPrefix === 'function' ? shouldShowPrefix() : true) && prefix) {
        finalPrefix = prefix; // We no longer escape HTML here, the generator does it or assumes safe text
    }

    // 4. Build the 'urls' array dictionary
    const urls = [];

    let hasMainLink = (subLinks.length === 1 && !isNamedUrl(subLinks[0]))
        || (subLinks.length === 0 && otherLinks.length === 0 && (sourceLinks.length === 1 && !isNamedUrl(sourceLinks[0])));
    console.log('has main link', hasMainLink)

    // parse the sub links
    parseLinkArray(subLinks, urls, title === "" ? "Sub" : title, 'Part');

    // parse the named links
    parseLinkArray(otherLinks, urls, 'Other', 'Other');

    // parse the source links
    parseLinkArray(sourceLinks, urls, urls.length === 0 && title !== "" ? title : 'Source', urls.length > 0 ? 'Source' : 'Part');

    // parse the named links
    for (const named of otherLinks)
    {
        console.log(named);
    }

    // 5. Build Suffix (Members)
    let suffix = null;
    if (initials) {
        const formattedMembersArray = initials.split(/[\s,&]+/).filter(Boolean).map(init => MEMBER_MAP[init.trim()] || init.trim());
        suffix = (typeof joinWithAnd === 'function') ? joinWithAnd(formattedMembersArray) : formattedMembersArray.join(' and ');
    }

    let displayTitle = hasMainLink ? null : title

    // 6. Return the clean dictionary
    return {
        subbed: hasSub,
        date: date,
        prefix: finalPrefix,
        title: displayTitle,
        isPrefixBold: true, // Replicates your original `<span style="font-weight:700;">`
        urls: urls,
        suffix: suffix
    };
}

function parseGoogleSheetHtml(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const rows = doc.querySelectorAll('tr');
    return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        return Array.from(cells).map(cell => {
            const links = cell.querySelectorAll('a');
            if (links.length > 0) {
                return Array.from(links).map(link => ({ text: link.textContent.trim(), url: link.href }));
            } else {
                return cell.textContent.trim();
            }
        });
    });
}

async function getHtmlFromClipboard() {
    try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
            if (item.types.includes('text/html')) {
                const blob = await item.getType('text/html');
                return await blob.text();
            }
        }
        alert("No HTML content found on the clipboard.");
        return null;
    } catch (err) {
        console.error("Failed to read from clipboard:", err);
        alert("Could not read from clipboard.");
        return null;
    }
}

function shouldShowPrefix() {
    const checkbox = document.getElementById('showPrefixCheckbox');

    // Return the checkbox's state, or true if it can't be found (a safe default)
    return checkbox ? checkbox.checked : true;
}

function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function parseTitleAndMembers(fullTitle) {
    const match = fullTitle.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (match) {
        return { name: match[1].trim(), initials: match[2].trim() };
    }
    return { name: fullTitle.trim(), initials: '' };
}

function joinWithAnd(arr) {
    if (arr.length === 0) return "";
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return arr.join(" & ");
    return arr.slice(0, -1).join(", ") + " & " + arr[arr.length - 1];
}

function splitTitle(text) {
    // If it starts with [ ... ], extract prefix + title
    const match = text.match(/^\[(.*?)\]\s*(.*)$/);

    if (match) {
        return {
            prefix: match[1],
            title: match[2]
        };
    }

    // No prefix → whole text is title
    return {
        prefix: null,
        title: text
    };
}

const pasteButton = document.getElementById('pasteAndFormatButton');
const resultContainer = document.getElementById('resultContainer');
const outputElement = document.getElementById('output');
const copyButton = document.getElementById('copyButton');

if (copyButton) {
    copyButton.addEventListener('click', NEW_copyOutputToClipboard2);
    // copyButton.addEventListener('click', testing);
} else {
    console.warn('The "Copy to Clipboard" button with id="copyButton" was not found in the HTML.');
}

pasteButton.addEventListener('click', async () => {
    pasteButton.textContent = 'Processing...';
    pasteButton.disabled = true;
    resultContainer.style.display = 'none';

    try {
        const sheetHtml = await getHtmlFromClipboard();
        if (sheetHtml) {
            const parsedRows = parseGoogleSheetHtml(sheetHtml);

            // Step 1: Group rows by category
            const groupedRows = {};
            parsedRows.forEach(rowData => {
                if (rowData.length < 4 || (!rowData[1] && !rowData[2])) return; // Skip invalid rows

                const category = rowData[headers.indexOf("Category")] || '⚠️NO CATEGORY⚠️';
                if (!groupedRows[category]) {
                    groupedRows[category] = [];
                }
                groupedRows[category].push(rowData);
            });

            // Step 2: Build the final HTML with headers for each group
            const finalHtmlParts = [];
            for (const category in groupedRows) {

                // Convert sheet rows into our new dictionary format
                const rowsForCategory = groupedRows[category];
                const dictList = rowsForCategory
                    .map(rowData => NEW_formatRowData(rowData))
                    .filter(item => item !== null); // Filter out invalid rows

                // Add the category header and the new list format
                if (dictList.length > 0) {
                    // Add the category header
                    finalHtmlParts.push(`<h3 class="category-header">${escapeHtml(category)}</h3>`);

                    // Generate the perfectly formatted <ul> block
                    const generatedBlock = generateSitesListHTML(dictList);
                    finalHtmlParts.push(generatedBlock.html);
                }
            }

            if (finalHtmlParts.length > 0) {
                // We can join with an empty string here because the <h3> and <ul> tags
                // handle block spacing naturally on the page.
                outputElement.innerHTML = finalHtmlParts.join('');
                resultContainer.style.display = 'block';
            } else {
                alert("Could not find any valid data rows to format.");
            }
        }
    } catch (error) {
        console.error('An unexpected error occurred:', error);
        alert('An unexpected error occurred during processing.');
    } finally {
        pasteButton.textContent = 'Paste and Format';
        pasteButton.disabled = false;
    }
});