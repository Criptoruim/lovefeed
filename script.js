// script.js

(() => {
    const globalFeed = document.getElementById('global-feed');
    const mostLovedCard = document.getElementById('most-loved-card');
    const submissionInput = document.getElementById('submission');
    const countrySelect = document.getElementById('country');
    const countryFilter = document.getElementById('country-filter');
    const suggestionsBox = document.createElement('div');
    suggestionsBox.classList.add('suggestions-box');
    submissionInput.parentNode.insertBefore(suggestionsBox, submissionInput.nextSibling);

    let globalMostLovedItem = null;
    let mostLovedByCountry = {};
    let filteredCountry = null; // Tracks if we're filtering by a country
    const submissions = {}; // Stores submissions by ID
    const userSubmissions = {}; // Track user submissions to highlight them
    const submissionTimers = {}; // Timers for each submission
    let topTimerInterval;
    let topTimeRemaining = 0;

    // Store the global counts separately
    const globalCounts = {};

    // Function to handle the submission
    function submitLove(event) {
        event.preventDefault();
        const love = submissionInput.value.trim();
        const country = countrySelect.value;

        if (!love || !country) {
            alert('Please fill in all fields.');
            return;
        }

        const submissionId = Date.now(); // Unique ID for each submission
        userSubmissions[submissionId] = true; // Track the user's submission
        addToFeed(submissionId, love, country);
        updateGlobalMostLovedItem();
        updateMostLovedCard();
        showSubmissionPopup(); // Show the submission popup message

        // Start or reset the top timer
        if (!topTimerInterval) {
            topTimeRemaining = 24 * 60 * 60; // 24 hours in seconds
            startTopTimer();
            document.getElementById('top-timer').style.display = 'block';
        } else {
            topTimeRemaining = 24 * 60 * 60;
        }

        event.target.reset();
        suggestionsBox.innerHTML = ''; // Clear suggestions after submission
    }

    // Function to start the top timer
    function startTopTimer() {
        const topTimerElement = document.getElementById('top-timer');
        topTimerInterval = setInterval(() => {
            topTimeRemaining--;
            if (topTimeRemaining <= 0) {
                clearInterval(topTimerInterval);
                topTimerInterval = null;
                topTimerElement.style.display = 'none';
            } else {
                const hours = Math.floor(topTimeRemaining / 3600);
                const minutes = Math.floor((topTimeRemaining % 3600) / 60);
                const seconds = topTimeRemaining % 60;
                topTimerElement.textContent = `${hours.toString().padStart(2, '0')}:${minutes
                    .toString()
                    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    // Function to add the submission to the global feed
    function addToFeed(submissionId, love, country) {
        submissions[submissionId] = {
            id: submissionId,
            love: love,
            country: country,
            count: 1,
            reports: 0,
            hearts: 0,
            heartClicked: false,
            timeRemaining: 24 * 60 * 60, // 24 hours in seconds
            submissionTime: new Date(), // Store the submission time
            timeAdded: 0, // Track additional time added
        };

        // Update country submissions
        if (!mostLovedByCountry[country]) {
            mostLovedByCountry[country] = {};
        }
        if (mostLovedByCountry[country][love]) {
            mostLovedByCountry[country][love]++;
        } else {
            mostLovedByCountry[country][love] = 1;
        }

        // Update global counts
        if (globalCounts[love]) {
            globalCounts[love]++;
        } else {
            globalCounts[love] = 1;
        }

        // Create feed item
        const feedItem = document.createElement('div');
        feedItem.classList.add('feed-item');
        feedItem.setAttribute('data-country', country);

        // Create the heart button
        const heartButton = document.createElement('button');
        heartButton.classList.add('heart-btn');
        heartButton.innerHTML = '❤️ <span class="heart-count">0</span>'; // Heart icon with a counter starting at 0

        // Handle click event for the heart button
        heartButton.onclick = function (e) {
            e.stopPropagation(); // Prevent event bubbling
            if (!submissions[submissionId].heartClicked) {
                submissions[submissionId].hearts++;
                heartButton.querySelector('.heart-count').textContent = submissions[submissionId].hearts;
                submissions[submissionId].heartClicked = true; // Prevent multiple clicks
                heartButton.classList.add('active'); // Highlight the heart
                extendSubmissionLife(submissionId); // Extend the life of the submission by 60 seconds
            } else {
                showPopup('You can only vote once per submission.');
            }
        };

        // Create report button with red flag emoji and hover text
        const reportButton = document.createElement('button');
        reportButton.classList.add('report-button');
        reportButton.innerHTML = '🚩'; // Red flag emoji
        reportButton.title = 'Report content';
        reportButton.onclick = function (e) {
            e.stopPropagation(); // Prevent event bubbling
            reportContent(submissionId, feedItem);
        };

        // Time remaining display
        const timeRemainingDisplay = document.createElement('p');
        timeRemainingDisplay.classList.add('time-remaining');
        updateTimeDisplay(submissionId, timeRemainingDisplay);

        // Append elements to feed item
        feedItem.innerHTML = `<p><strong>${love}</strong></p><p><span>${country}</span></p>`;
        feedItem.appendChild(timeRemainingDisplay); // Append the time remaining
        feedItem.appendChild(heartButton); // Append the heart button
        feedItem.appendChild(reportButton); // Append the report button

        // Handle click on feed item to filter by country
        feedItem.addEventListener('click', function (e) {
            // Ignore clicks on buttons inside the feed item
            if (e.target.tagName !== 'BUTTON' && !e.target.classList.contains('heart-btn') && !e.target.classList.contains('report-button')) {
                filterByClick(country);
            }
        });

        // Highlight user submissions
        if (userSubmissions[submissionId]) {
            feedItem.style.border = '2px solid yellow'; // Highlight the user's submission
        }

        // Prepend the feed item to the feed
        globalFeed.insertBefore(feedItem, globalFeed.firstChild);

        // Start the timer for this submission
        startSubmissionTimer(submissionId, feedItem, timeRemainingDisplay);

        // Update country filter options
        populateCountryFilters();
    }

    // Function to start the timer for a submission
    function startSubmissionTimer(submissionId, feedItem, timeDisplay) {
        submissionTimers[submissionId] = setInterval(() => {
            submissions[submissionId].timeRemaining--;

            if (submissions[submissionId].timeRemaining <= 0) {
                clearInterval(submissionTimers[submissionId]);
                removeSubmission(submissionId, feedItem);
            } else {
                updateTimeDisplay(submissionId, timeDisplay);
            }
        }, 1000);
    }

    // Function to extend the life of a submission by 60 seconds
    function extendSubmissionLife(submissionId) {
        submissions[submissionId].timeRemaining += 60;
        submissions[submissionId].timeAdded += 60;
        showPopup('You added 60 seconds to this submission’s time.');
    }

    // Function to update the time display for a submission
    function updateTimeDisplay(submissionId, element) {
        const submission = submissions[submissionId];
        const remainingTime = submission.timeRemaining;
        const hours = Math.floor(remainingTime / 3600);
        const minutes = Math.floor((remainingTime % 3600) / 60);
        const seconds = remainingTime % 60;
        element.textContent = `Time remaining: ${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        // Tooltip content
        const submissionTime = submission.submissionTime.toLocaleString();
        const timeAdded = submission.timeAdded;
        element.setAttribute(
            'data-tooltip',
            `Submitted: ${submissionTime}\nTime Added: ${timeAdded} sec`
        );
    }

    // Function to remove a submission
    function removeSubmission(submissionId, feedItem) {
        // Update global and country counts
        const love = submissions[submissionId].love;
        const country = submissions[submissionId].country;

        // Update global counts
        globalCounts[love]--;
        if (globalCounts[love] === 0) {
            delete globalCounts[love];
        }

        // Update country counts
        mostLovedByCountry[country][love]--;
        if (mostLovedByCountry[country][love] === 0) {
            delete mostLovedByCountry[country][love];
        }

        delete submissions[submissionId];
        globalFeed.removeChild(feedItem);
        updateGlobalMostLovedItem();
        updateMostLovedCard();
    }

    // Function to report content
    function reportContent(submissionId, feedItem) {
        if (confirm('Are you sure you want to report this content?')) {
            submissions[submissionId].reports++;
            if (submissions[submissionId].reports >= 5) {
                // Remove submission if reports reach threshold
                clearInterval(submissionTimers[submissionId]);
                removeSubmission(submissionId, feedItem);
            }
            alert('Thank you for your report. We will review the content.');
        }
    }

    // Function to update the global most loved item
    function updateGlobalMostLovedItem() {
        let maxCount = 0;
        globalMostLovedItem = null;

        // Check for the globally most loved item
        for (const love in globalCounts) {
            const count = globalCounts[love];
            if (count > maxCount) {
                maxCount = count;
                globalMostLovedItem = love;
            }
        }
    }

    // Function to update the most loved card based on selected country
    function updateMostLovedCard() {
        const selectedCountry = filteredCountry;
        let maxCount = 0;
        let mostLovedItem = null;
        let displayText = '';

        if (selectedCountry) {
            // Country-specific most loved item
            if (mostLovedByCountry[selectedCountry]) {
                for (const love in mostLovedByCountry[selectedCountry]) {
                    if (mostLovedByCountry[selectedCountry][love] > maxCount) {
                        maxCount = mostLovedByCountry[selectedCountry][love];
                        mostLovedItem = love;
                    }
                }
            }
            displayText = mostLovedItem
                ? `<p><strong>${mostLovedItem}</strong> has been submitted <strong>${maxCount}</strong> times in ${selectedCountry}!</p>`
                : `<p>No submissions yet for ${selectedCountry}</p>`;
        } else {
            // Global most loved item
            maxCount = globalCounts[globalMostLovedItem];
            mostLovedItem = globalMostLovedItem;
            displayText = mostLovedItem
                ? `<p><strong>${mostLovedItem}</strong> has been submitted <strong>${maxCount}</strong> times globally!</p>`
                : '<p>No submissions yet</p>';
        }

        // Update the most loved card
        mostLovedCard.innerHTML = displayText;

        // Update the share item preview
        document.getElementById('share-item-preview').textContent = mostLovedItem || 'No submissions yet';
    }

    // Function to filter feed by clicking on a country
    function filterByClick(country) {
        filteredCountry = country;
        filterFeedByCountry();
        // Update the dropdown to reflect the selected country
        countryFilter.value = country;
    }

    // Function to filter the feed by the country selected in the dropdown
    function filterFeedByCountry() {
        const selectedCountry = countryFilter.value;
        filteredCountry = selectedCountry === 'all' ? null : selectedCountry;
        const feedItems = document.querySelectorAll('.feed-item');
        feedItems.forEach(item => {
            if (!filteredCountry || item.getAttribute('data-country') === filteredCountry) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });

        // Update the most loved card for the selected country
        updateMostLovedCard();
    }

    // Function to reset the feed and show all items
    function resetFeed() {
        filteredCountry = null;
        countryFilter.value = 'all';
        const feedItems = document.querySelectorAll('.feed-item');
        feedItems.forEach(item => {
            item.style.display = 'block';
        });
        updateMostLovedCard();
    }

    // Autocomplete Feature: Suggests items as the user types
    submissionInput.addEventListener('input', function () {
        const query = submissionInput.value.toLowerCase();
        suggestionsBox.innerHTML = ''; // Clear suggestions

        if (query.length > 0) {
            let suggestions = [];

            // Collect suggestions from submissions
            for (const id in submissions) {
                const love = submissions[id].love;
                if (love.toLowerCase().startsWith(query) && !suggestions.includes(love)) {
                    suggestions.push(love);
                }
            }

            // Show suggestions
            suggestions.forEach(suggestion => {
                const suggestionItem = document.createElement('div');
                suggestionItem.classList.add('suggestion-item');
                suggestionItem.innerText = suggestion;
                suggestionItem.onclick = () => {
                    submissionInput.value = suggestion;
                    suggestionsBox.innerHTML = ''; // Clear suggestions on selection
                };
                suggestionsBox.appendChild(suggestionItem);
            });
        }
    });

    // Function to show popups with custom messages
    function showPopup(message) {
        const alertPopup = document.getElementById('alertPopup');
        const alertMessage = document.getElementById('alertMessage');
        alertMessage.textContent = message;
        alertPopup.classList.add('active');
    }

    // Function to close the alert popup
    function closeAlertPopup() {
        const alertPopup = document.getElementById('alertPopup');
        alertPopup.classList.remove('active');
    }

    // Show submission popup
    function showSubmissionPopup() {
        showPopup('Your submission will be live for the next 24 hours.');
    }

    // Share functionality
    function shareMostLoved() {
        const sharePopup = document.getElementById('share-popup');
        let mostLovedItem = document.getElementById('share-item-preview').textContent;

        if (!mostLovedItem || mostLovedItem === 'No submissions yet') {
            alert('No most loved item to share yet!');
            return;
        }

        // Update the share popup title based on the filtered country
        const titleElement = sharePopup.querySelector('.share-popup-content h2');
        if (filteredCountry) {
            titleElement.textContent = `Here’s what people in ${filteredCountry} are loving the most today:`;
        } else {
            titleElement.textContent = `Here’s what people around the world are loving the most today:`;
        }

        sharePopup.classList.remove('hidden');
    }

    function closeSharePopup() {
        const sharePopup = document.getElementById('share-popup');
        sharePopup.classList.add('hidden');
    }

    // Social media share functions
    function buildShareMessage() {
        let mostLovedItem = document.getElementById('share-item-preview').textContent;
        let shareMessage;

        if (filteredCountry) {
            shareMessage = `In ${filteredCountry}, people are loving:\n${mostLovedItem}\n\nWhat brings you joy? Share yours before midnight! #GlobalLoveToday`;
        } else {
            shareMessage = `Here’s what people around the world are loving the most today:\n${mostLovedItem}\n\nWhat brings you joy? Share yours before midnight! #GlobalLoveToday`;
        }

        return shareMessage;
    }

    function shareToTwitter() {
        const shareText = buildShareMessage();
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`;
        window.open(twitterUrl, '_blank'); // Opens the sharing page in a new tab
    }

    function shareToFacebook() {
        const shareText = buildShareMessage();
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(shareText)}`;
        window.open(facebookUrl, '_blank'); // Opens the sharing page in a new tab
    }

    function shareToInstagram() {
        const shareText = buildShareMessage();
        alert(`Copy the message below and share it on Instagram:\n\n${shareText}`);
    }

    // Function to populate country filters
    function populateCountryFilters() {
        const countrySet = new Set();

        for (const id in submissions) {
            countrySet.add(submissions[id].country);
        }

        // Clear existing options except the first
        countryFilter.options.length = 1;

        countrySet.forEach((country) => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countryFilter.appendChild(option);
        });
    }

    // Handle clicks outside the suggestions box to close it
    document.addEventListener('click', function (event) {
        if (!suggestionsBox.contains(event.target) && event.target !== submissionInput) {
            suggestionsBox.innerHTML = '';
        }
    });

    // Event Listeners
    document.querySelector('.submit-form').addEventListener('submit', submitLove);
    countryFilter.addEventListener('change', filterFeedByCountry);
    document.getElementById('share-button').addEventListener('click', shareMostLoved);
    document.querySelector('.reset-button').addEventListener('click', resetFeed);

    // Expose functions to the global scope if needed
    window.shareToTwitter = shareToTwitter;
    window.shareToFacebook = shareToFacebook;
    window.shareToInstagram = shareToInstagram;
    window.closeSharePopup = closeSharePopup;
    window.filterFeedByCountry = filterFeedByCountry;
    window.resetFeed = resetFeed;
    window.closeAlertPopup = closeAlertPopup;
})();
