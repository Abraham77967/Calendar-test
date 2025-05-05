// Firebase configuration - REPLACE WITH YOUR OWN CONFIG from Firebase console
// Go to your Firebase project > Project Settings > Add Web App > Copy the config object
const firebaseConfig = {
    apiKey: "AIzaSyCOgSFssUQohtp7znEfq3mb2bmTH-00p4c",
    authDomain: "calendar-7f322.firebaseapp.com",
    projectId: "calendar-7f322",
    storageBucket: "calendar-7f322.firebasestorage.app",
    messagingSenderId: "127539488630",
    appId: "1:127539488630:web:5c60fb6e5417d12bd37c57"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Function to completely clear all calendar data
function clearAllCalendarData() {
    // Clear localStorage
    localStorage.removeItem('calendarNotes');
    
    // Ensure notes variable is empty when defined
    return {};
}

document.addEventListener('DOMContentLoaded', () => {
    // Declare notes in the outer scope of the DOMContentLoaded listener
    let notes = clearAllCalendarData();
    
    // Check for redirect result first
    firebase.auth().getRedirectResult().then((result) => {
        if (result.user) {
            console.log('Google sign in successful via redirect:', result.user.email);
        }
    }).catch((error) => {
        console.error('Redirect sign-in error:', error);
        if (error.code !== 'auth/null-user') {
            alert(`Sign in failed: ${error.message}`);
        }
    });
    
    // Get references for calendar and shared controls
    const monthYearDisplayElement = document.getElementById('month-year-display'); // Top control header
    const calendarGrid1 = document.getElementById('calendar-grid-1');
    const monthYearElement1 = document.getElementById('month-year-1');
    const calendarGrid2 = document.getElementById('calendar-grid-2'); // Added back
    const monthYearElement2 = document.getElementById('month-year-2'); // Added back
    const calendar2Container = document.getElementById('calendar-2'); // Container for hiding
    
    const prevButton = document.getElementById('prev-month'); // Use generic name
    const nextButton = document.getElementById('next-month'); // Use generic name
    
    const noteModal = document.getElementById('note-modal');
    const modalDateElement = document.getElementById('modal-date');
    const closeButton = document.querySelector('.close-button');
    
    // New modal elements for multi-event support
    const eventsListElement = document.getElementById('events-list');
    
    // Add new event section elements
    const newEventTimeElement = document.getElementById('new-event-time');
    const newEventTextElement = document.getElementById('new-event-text');
    const newEventChecklistElement = document.getElementById('new-event-checklist');
    const newChecklistItemElement = document.getElementById('new-checklist-item');
    const addItemButton = document.getElementById('add-item-button');
    const addEventButton = document.getElementById('add-event-button');
    
    // Edit event section elements
    const editEventSection = document.getElementById('edit-event-section');
    const editEventTimeElement = document.getElementById('edit-event-time');
    const editEventTextElement = document.getElementById('edit-event-text');
    const editEventChecklistElement = document.getElementById('edit-event-checklist');
    const editChecklistItemElement = document.getElementById('edit-checklist-item');
    const editAddItemButton = document.getElementById('edit-add-item-button');
    const saveEditedEventButton = document.getElementById('save-edited-event');
    const cancelEditButton = document.getElementById('cancel-edit');
    const deleteEventButton = document.getElementById('delete-event');
    
    // Progress panel elements
    const eventProgressPanel = document.getElementById('event-progress-panel');
    const progressItemsContainer = document.getElementById('progress-items-container');
    
    // Authentication elements
    const loginForm = document.getElementById('login-form');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    const googleSignInButton = document.getElementById('google-signin-button');
    const logoutButton = document.getElementById('logout-button');
    const toggleViewButton = document.getElementById('toggle-view-button');

    let currentView = 'week'; // Mobile view state: 'week' or 'month'
    let desktopMonthDate = new Date(); // For desktop two-month navigation
    desktopMonthDate.setDate(1);
    let mobileMonthDate = new Date(); // For mobile month view navigation
    mobileMonthDate.setDate(1);
    let mobileWeekStartDate = new Date(); // For mobile week view navigation
    mobileWeekStartDate.setHours(0, 0, 0, 0);
    let selectedDateString = null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add variable to track current event being edited
    let currentEditingEventId = null;

    // --- Firebase Authentication Logic ---
    
    // Google Sign-in
    googleSignInButton.addEventListener('click', () => {
        console.log('Starting Google sign in process');
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Add scopes if needed
        provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
        
        // Set custom parameters
        provider.setCustomParameters({
            'login_hint': 'user@example.com',
            'prompt': 'select_account'
        });
        
        firebase.auth().signInWithPopup(provider)
            .then((result) => {
                console.log('Google sign in successful:', result.user.email);
            })
            .catch((error) => {
                console.error('Google sign in error:', error);
                
                // Try redirect method if popup fails
                if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
                    console.log('Popup was blocked or closed, trying redirect method');
                    firebase.auth().signInWithRedirect(provider);
                } else {
                    alert(`Sign in failed: ${error.message}`);
                }
            });
    });
    
    // Logout event
    logoutButton.addEventListener('click', () => {
        firebase.auth().signOut()
            .then(() => {
                console.log('User signed out successfully');
                // Force a complete page reload to ensure clean state
                window.location.reload(true);
            })
            .catch((error) => {
                console.error('Sign out error:', error);
            });
    });
    
    // Check authentication state
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            console.log('User detected:', user.email);
            loginForm.style.display = 'none';
            userInfo.style.display = 'block';
            userEmail.textContent = user.email;
            
            // Fetch notes from Firestore
            console.log('Fetching notes for user:', user.uid);
            db.collection('userNotes').doc(user.uid).get()
                .then(doc => {
                    console.log('Firestore response:', doc.exists ? 'Document exists' : 'No document found');
                    if (doc.exists && doc.data().notes) {
                        // Use cloud data only when signed in
                        notes = doc.data().notes;
                        console.log('Loaded notes from cloud');
                        renderCalendarView();
                    } else {
                        // No cloud data, start with empty notes
                        notes = {};
                        console.log('No existing notes found in cloud, starting fresh');
                        renderCalendarView();
                    }
                })
                .catch(error => {
                    console.error("Error fetching notes:", error);
                    alert("Error fetching your calendar data: " + error.message);
                    notes = {}; // Reset on error
                    renderCalendarView(); // Render empty view on error
                });
        } else {
            // User is signed out - aggressively clear all data
            console.log('No user logged in - clearing all data');
            loginForm.style.display = 'block';
            userInfo.style.display = 'none';
            
            // Clear all calendar data completely
            notes = clearAllCalendarData();
            console.log('All calendar data cleared');
            
            // Re-render with empty data
            renderCalendarView();
        }
    });
    
    // --- End Firebase Authentication Logic ---

    // --- Helper Function: Format Time Difference ---
    function formatTimeDifference(date1, date2) {
        const diffTime = date1.getTime() - date2.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Difference in days

        if (diffDays === 0) {
            return "(Today)";
        } else if (diffDays === 1) {
            return "(Tomorrow)";
        } else if (diffDays === -1) {
            return "(Yesterday)";
        } else if (diffDays > 1) {
            return `(in ${diffDays} days)`;
        } else { // diffDays < -1
            return `(${-diffDays} days ago)`;
        }
    }
    // --- End Helper Function ---

    // --- Rendering Functions ---

    // Renders a single month into a specific grid/header element
    function renderCalendar(targetDate, gridElement, monthYearElement) {
         // Safety check
        if (!firebase.auth().currentUser) {
            notes = clearAllCalendarData(); // Ensure notes are clear if somehow called when logged out
        }
        
        // Clear previous grid days
        while (gridElement.children.length > 7) {
            gridElement.removeChild(gridElement.lastChild);
        }

        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();

        monthYearElement.textContent = `${targetDate.toLocaleString('default', { month: 'long' })} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Add empty prefix days
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.classList.add('day', 'other-month');
            gridElement.appendChild(emptyDiv);
        }

        // Add actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            const currentDate = new Date(year, month, day);
            currentDate.setHours(0, 0, 0, 0);

            dayElement.classList.add('day');
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayElement.dataset.date = dateString;

            const dayNumber = document.createElement('span');
            dayNumber.classList.add('day-number');
            dayNumber.textContent = day;
            dayElement.appendChild(dayNumber);

            if (currentDate.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }

            // --- Display Events --- 
            const eventsForDay = notes[dateString] || [];
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('day-events');

            if (eventsForDay.length === 1) {
                // Show single event text (truncated)
                const eventTextElement = document.createElement('div');
                eventTextElement.classList.add('note-text', 'single-event');
                let displayText = eventsForDay[0].text || '(No description)';
                if (eventsForDay[0].time) displayText = `${eventsForDay[0].time} - ${displayText}`; 
                eventTextElement.textContent = displayText;
                eventsContainer.appendChild(eventTextElement);
            } else if (eventsForDay.length > 1) {
                // Show event count
                const eventCountElement = document.createElement('div');
                eventCountElement.classList.add('note-text', 'event-count');
                eventCountElement.textContent = `${eventsForDay.length} Events`;
                eventsContainer.appendChild(eventCountElement);
            }
            dayElement.appendChild(eventsContainer);
            // --- End Display Events ---

            dayElement.addEventListener('click', () => openNoteModal(dateString));
            gridElement.appendChild(dayElement);
        }
    }

    // Renders two adjacent months for desktop
    function renderDesktopView() {
        const firstMonthDate = new Date(desktopMonthDate);
        const secondMonthDate = new Date(desktopMonthDate);
        secondMonthDate.setMonth(secondMonthDate.getMonth() + 1);

        renderCalendar(firstMonthDate, calendarGrid1, monthYearElement1);
        renderCalendar(secondMonthDate, calendarGrid2, monthYearElement2);

        // Update the main control header for desktop view
        const month1Name = firstMonthDate.toLocaleString('default', { month: 'long' });
        const month2Name = secondMonthDate.toLocaleString('default', { month: 'long' });
        const year1 = firstMonthDate.getFullYear();
        const year2 = secondMonthDate.getFullYear();
        monthYearDisplayElement.textContent = year1 === year2 ? `${month1Name} & ${month2Name} ${year1}` : `${month1Name} ${year1} & ${month2Name} ${year2}`;
    }
    
    // Renders the mobile month view (uses renderCalendar)
    function renderMobileMonthView() {
        renderCalendar(mobileMonthDate, calendarGrid1, monthYearElement1);
        monthYearDisplayElement.textContent = mobileMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }

    // Renders the mobile two-week view
    function renderMobileTwoWeekView() {
        if (!firebase.auth().currentUser) {
            notes = clearAllCalendarData();
        }
        
        // Clear previous grid days
        while (calendarGrid1.children.length > 7) {
            calendarGrid1.removeChild(calendarGrid1.lastChild);
        }

        const startDate = new Date(mobileWeekStartDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 13);

        // Update header display (use monthYearElement1 for the single calendar header)
        const options = { month: 'short', day: 'numeric' };
        monthYearElement1.textContent = `${startDate.toLocaleDateString('default', options)} - ${endDate.toLocaleDateString('default', options)}, ${startDate.getFullYear()}`;
        monthYearDisplayElement.textContent = `${startDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}`; // Update top control header

        for (let i = 0; i < 14; i++) {
            const dayElement = document.createElement('div');
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + i);
            currentDate.setHours(0, 0, 0, 0);

            // Add both day and week-view classes
            dayElement.classList.add('day', 'week-view');
            const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            dayElement.dataset.date = dateString;

            const dayNameElement = document.createElement('div');
            dayNameElement.classList.add('day-name');
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            dayNameElement.textContent = dayNames[currentDate.getDay()];
            dayElement.appendChild(dayNameElement);
            
            const dayNumberElement = document.createElement('div');
            dayNumberElement.classList.add('day-number');
            dayNumberElement.textContent = currentDate.getDate();
            dayElement.appendChild(dayNumberElement);
            
            if (currentDate.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }

            // --- Display Events --- 
            const eventsForDay = notes[dateString] || [];
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('day-events');

            if (eventsForDay.length === 1) {
                // Show single event text (truncated)
                const eventTextElement = document.createElement('div');
                eventTextElement.classList.add('note-text', 'single-event');
                let displayText = eventsForDay[0].text || '(No description)';
                if (eventsForDay[0].time) displayText = `${eventsForDay[0].time} - ${displayText}`; 
                eventTextElement.textContent = displayText;
                eventsContainer.appendChild(eventTextElement);
            } else if (eventsForDay.length > 1) {
                // Show event count
                const eventCountElement = document.createElement('div');
                eventCountElement.classList.add('note-text', 'event-count');
                eventCountElement.textContent = `${eventsForDay.length} Events`;
                eventsContainer.appendChild(eventCountElement);
            }
            dayElement.appendChild(eventsContainer);
            // --- End Display Events ---

            dayElement.addEventListener('click', () => openNoteModal(dateString));
            calendarGrid1.appendChild(dayElement);
        }
    }

    // --- Combined Render Function (Checks screen size) ---
    function renderCalendarView() {
        const isDesktop = window.innerWidth > 1200;
        
        // Show/Hide second calendar and toggle button based on screen size
        calendar2Container.style.display = isDesktop ? 'block' : 'none';
        toggleViewButton.style.display = isDesktop ? 'none' : 'inline-block'; // Hide toggle on desktop
        
        if (isDesktop) {
            renderDesktopView();
        } else { // Mobile view
            if (currentView === 'week') {
                renderMobileTwoWeekView();
                toggleViewButton.textContent = 'Month View';
            } else {
                renderMobileMonthView();
                toggleViewButton.textContent = 'Week View';
            }
        }
        
        // Always render progress panel
        renderEventProgressPanel();
    }

    // --- Event Progress Panel for Multiple Events ---
    function renderEventProgressPanel() {
        // Skip rendering if not logged in
        if (!firebase.auth().currentUser) {
            // Clear panel
            progressItemsContainer.innerHTML = '';
            return;
        }
        
        console.log('Starting to render progress panel');
        
        // Clear existing panel content
        progressItemsContainer.innerHTML = '';
        
        // Get all dates with events
        const datesWithEvents = Object.entries(notes);
        console.log('All dates with events:', datesWithEvents);
        
        // Filter to include only events with checklists and sort by date
        let eventsWithChecklists = [];
        
        datesWithEvents.forEach(([dateString, eventsArray]) => {
            console.log(`Processing date ${dateString} with ${eventsArray.length} events`);
            
            // For each date, filter to events with checklists
            const dateEvents = eventsArray.filter(event => {
                const hasChecklist = event.checklist && event.checklist.length > 0;
                console.log(`Event ${event.id}: has checklist = ${hasChecklist}, items: ${event.checklist ? event.checklist.length : 0}`);
                return hasChecklist;
            });
            
            console.log(`Found ${dateEvents.length} events with checklists for ${dateString}`);
            
            // Add date and event details to our array
            dateEvents.forEach(event => {
                eventsWithChecklists.push({
                    dateString,
                    event
                });
            });
        });
        
        console.log('Total events with checklists:', eventsWithChecklists.length);
        
        // Sort by date
        eventsWithChecklists.sort((a, b) => new Date(a.dateString) - new Date(b.dateString));
        
        // If no events with checklists, show message
        if (eventsWithChecklists.length === 0) {
            const noEventsMessage = document.createElement('div');
            noEventsMessage.classList.add('no-events-message-panel');
            noEventsMessage.textContent = 'No upcoming events with checklists. Add some checklists to your events!';
            progressItemsContainer.appendChild(noEventsMessage);
            return;
        }
        
        // Group events by date for the panel
        const groupedByDate = {};
        
        eventsWithChecklists.forEach(item => {
            if (!groupedByDate[item.dateString]) {
                groupedByDate[item.dateString] = [];
            }
            groupedByDate[item.dateString].push(item.event);
        });
        
        // Create and append elements for each date
        Object.entries(groupedByDate).forEach(([dateString, events]) => {
            // Create the card container
            const itemContainer = document.createElement('div');
            itemContainer.classList.add('progress-item');

            // Create header section with date
            const headerSection = document.createElement('div');
            headerSection.classList.add('progress-item-header');
            
            // Add Date
            const itemDate = document.createElement('span');
            itemDate.classList.add('item-date');
            const [year, month, day] = dateString.split('-');
            const dateObj = new Date(year, month-1, day);
            
            // Format date with day of week and relative time indicator
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const relativeTimeStr = formatTimeDifference(dateObj, today);
            
            itemDate.textContent = `${dateObj.toLocaleDateString('en-US', { 
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' 
            })} ${relativeTimeStr}`;
            
            headerSection.appendChild(itemDate);

            // Add Date Text
            const itemText = document.createElement('div');
            itemText.classList.add('item-text');
            itemText.textContent = `${events.length} event${events.length > 1 ? 's' : ''}`;
            headerSection.appendChild(itemText);
            
            itemContainer.appendChild(headerSection);

            // Add Events Container
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('events-container');
            
            // Add each event
            events.forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.classList.add('panel-event');
                
                // Add event time and text
                const eventDetails = document.createElement('div');
                
                if (event.time) {
                    const timeElement = document.createElement('span');
                    timeElement.classList.add('panel-event-time');
                    timeElement.textContent = event.time;
                    eventDetails.appendChild(timeElement);
                }
                
                const textElement = document.createElement('span');
                textElement.classList.add('panel-event-text');
                textElement.textContent = event.text || '(No description)';
                eventDetails.appendChild(textElement);
                
                eventElement.appendChild(eventDetails);
                
                // Add checklist progress for this event
                if (event.checklist && event.checklist.length > 0) {
                    const totalItems = event.checklist.length;
                    const completedItems = event.checklist.filter(item => item.done).length;
                    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

                    const progressContainer = document.createElement('div');
                    progressContainer.classList.add('progress-container');
                    
                    const progressBarContainer = document.createElement('div');
                    progressBarContainer.classList.add('progress-bar-container');
                    
                    const progressBar = document.createElement('div');
                    progressBar.classList.add('progress-bar');
                    progressBar.style.width = `${progress}%`;
                    
                    progressBarContainer.appendChild(progressBar);
                    progressContainer.appendChild(progressBarContainer);

                    const progressSummary = document.createElement('div');
                    progressSummary.classList.add('progress-summary');
                    progressSummary.textContent = `${completedItems}/${totalItems} Tasks Completed`;
                    
                    // Add toggle button
                    const toggleButton = document.createElement('button');
                    toggleButton.classList.add('toggle-checklist-button');
                    toggleButton.textContent = 'Show Tasks';
                    toggleButton.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent event bubble to parent (which opens modal)
                        const checklistContainer = e.target.nextElementSibling;
                        if (checklistContainer.style.display === 'none' || !checklistContainer.style.display) {
                            checklistContainer.style.display = 'block';
                            e.target.textContent = 'Hide Tasks';
                        } else {
                            checklistContainer.style.display = 'none';
                            e.target.textContent = 'Show Tasks';
                        }
                    });
                    
                    // Create checklist container (initially hidden)
                    const checklistContainer = document.createElement('div');
                    checklistContainer.classList.add('panel-checklist-container');
                    checklistContainer.style.display = 'none';
                    
                    // Add checklist items
                    const checklistUl = document.createElement('ul');
                    checklistUl.classList.add('panel-checklist');
                    
                    event.checklist.forEach((item, index) => {
                        const li = document.createElement('li');
                        
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.checked = item.done;
                        checkbox.id = `panel-${dateString}-${event.id}-item-${index}`;
                        
                        // Add event listener to update checklist item
                        checkbox.addEventListener('change', (e) => {
                            e.stopPropagation(); // Prevent event bubble
                            
                            // Update the checklist item in the notes data
                            const events = notes[dateString];
                            const eventIndex = events.findIndex(e => e.id === event.id);
                            if (eventIndex !== -1) {
                                events[eventIndex].checklist[index].done = checkbox.checked;
                                
                                // Save to Firebase
                                saveNotesToFirebase().then(() => {
                                    // Update UI elements
                                    label.classList.toggle('completed', checkbox.checked);
                                    
                                    // Update completed count and progress bar
                                    const newCompletedItems = events[eventIndex].checklist.filter(item => item.done).length;
                                    const newProgress = (newCompletedItems / totalItems) * 100;
                                    
                                    progressBar.style.width = `${newProgress}%`;
                                    progressSummary.textContent = `${newCompletedItems}/${totalItems} Tasks Completed`;
                                });
                            }
                        });
                        
                        const label = document.createElement('label');
                        label.htmlFor = checkbox.id;
                        label.textContent = item.task;
                        if (item.done) {
                            label.classList.add('completed');
                        }
                        
                        li.appendChild(checkbox);
                        li.appendChild(label);
                        checklistUl.appendChild(li);
                    });
                    
                    checklistContainer.appendChild(checklistUl);
                    progressContainer.appendChild(progressSummary);
                    
                    eventElement.appendChild(progressContainer);
                    eventElement.appendChild(toggleButton);
                    eventElement.appendChild(checklistContainer);
                }
                
                // Add click handler to open the modal for this date and select this event
                eventElement.addEventListener('click', () => {
                    openNoteModal(dateString);
                    // Find and click the event in the modal to edit it
                    setTimeout(() => {
                        const eventItems = eventsListElement.querySelectorAll('.event-item');
                        eventItems.forEach(item => {
                            if (item.dataset.eventId == event.id) {
                                item.click();
                            }
                        });
                    }, 100);
                });
                
                eventsContainer.appendChild(eventElement);
            });
            
            itemContainer.appendChild(eventsContainer);
            progressItemsContainer.appendChild(itemContainer);
        });
    }

    // --- Modal Functions ---
    function openNoteModal(dateString) {
        // Don't allow adding notes if not signed in
        if (!firebase.auth().currentUser) {
            alert("Please sign in to add or view notes");
            return;
        }
        
        selectedDateString = dateString;
        const [year, month, day] = dateString.split('-');
        const dateObj = new Date(year, month - 1, day);
        modalDateElement.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        
        // Reset any editing state
        hideEditEventSection();
        
        // Reset new event form
        newEventTimeElement.value = '';
        newEventTextElement.value = '';
        newEventChecklistElement.innerHTML = '';
        newChecklistItemElement.value = '';
        
        // Display events for this date
        displayEventsInModal();
        
        noteModal.style.display = 'block';
    }

    function closeNoteModal() {
        noteModal.style.display = 'none';
        selectedDateString = null;
        currentEditingEventId = null;
    }
    
    // Display all events for the selected date
    function displayEventsInModal() {
        // Get events for the selected date
        const eventsForDay = notes[selectedDateString] || [];
        
        // Clear the events list
        eventsListElement.innerHTML = '';
        
        if (eventsForDay.length === 0) {
            // Show "no events" message
            const noEventsMessage = document.createElement('div');
            noEventsMessage.classList.add('no-events-message');
            noEventsMessage.textContent = 'No events for this day. Add one below.';
            eventsListElement.appendChild(noEventsMessage);
        } else {
            // Create and display each event in the list
            eventsForDay.forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.classList.add('event-item');
                eventItem.dataset.eventId = event.id; // Store event ID for editing
                
                // Time section (if exists)
                const timeElement = document.createElement('div');
                timeElement.classList.add('event-time');
                timeElement.textContent = event.time || '-';
                
                // Text section (description)
                const textElement = document.createElement('div');
                textElement.classList.add('event-text');
                textElement.textContent = event.text || '(No description)';
                
                // Checklist indicator (if has checklist)
                if (event.checklist && event.checklist.length > 0) {
                    const completedItems = event.checklist.filter(item => item.done).length;
                    const checklistIndicator = document.createElement('div');
                    checklistIndicator.classList.add('event-checklist-indicator');
                    checklistIndicator.textContent = `✓ ${completedItems}/${event.checklist.length}`;
                    eventItem.appendChild(timeElement);
                    eventItem.appendChild(textElement);
                    eventItem.appendChild(checklistIndicator);
                } else {
                    eventItem.appendChild(timeElement);
                    eventItem.appendChild(textElement);
                }
                
                // Add click handler to edit this event
                eventItem.addEventListener('click', () => {
                    handleEditEvent(event);
                });
                
                eventsListElement.appendChild(eventItem);
            });
        }
    }
    
    // Render checklist for new event
    function renderChecklistForNewEvent(checklist = []) {
        newEventChecklistElement.innerHTML = '';
        
        checklist.forEach((item, index) => {
            const li = document.createElement('li');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.done;
            checkbox.id = `new-item-${index}`;
            
            const label = document.createElement('label');
            label.htmlFor = `new-item-${index}`;
            label.textContent = item.task;
            if (item.done) {
                label.classList.add('completed');
            }
            
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-item-button');
            deleteButton.innerHTML = '&times;';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling up
                li.remove();
            });
            
            checkbox.addEventListener('change', () => {
                label.classList.toggle('completed', checkbox.checked);
            });
            
            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(deleteButton);
            newEventChecklistElement.appendChild(li);
        });
    }
    
    // Render checklist for edit section
    function renderChecklistForEditEvent(checklist = []) {
        editEventChecklistElement.innerHTML = '';
        
        checklist.forEach((item, index) => {
            const li = document.createElement('li');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.done;
            checkbox.id = `edit-item-${index}`;

            const label = document.createElement('label');
            label.htmlFor = `edit-item-${index}`;
            label.textContent = item.task;
            if (item.done) {
                label.classList.add('completed');
            }

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-item-button');
            deleteButton.innerHTML = '&times;';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling up
                li.remove();
            });
            
            checkbox.addEventListener('change', () => {
                label.classList.toggle('completed', checkbox.checked);
            });

            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(deleteButton);
            editEventChecklistElement.appendChild(li);
        });
    }
    
    // Function to gather checklist data from UI
    function getChecklistFromUI(checklistElement) {
        const checklist = [];
        const items = checklistElement.querySelectorAll('li');
        
        console.log(`Getting checklist from UI, found ${items.length} items`);
        
        items.forEach((li, index) => {
            const checkbox = li.querySelector('input[type="checkbox"]');
            const label = li.querySelector('label');
            
            if (checkbox && label) {
                const item = {
                    task: label.textContent,
                    done: checkbox.checked
                };
                console.log(`Checklist item ${index}: "${item.task}", done: ${item.done}`);
                checklist.push(item);
            } else {
                console.log(`Checklist item ${index}: missing checkbox or label elements`);
            }
        });
        
        console.log('Final checklist items:', checklist);
        return checklist;
    }
    
    // Function to add checklist item to new event form
    function addNewEventChecklistItem() {
        const taskText = newChecklistItemElement.value.trim();
        if (taskText) {
            const item = { task: taskText, done: false };
            
            const li = document.createElement('li');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `new-item-${Date.now()}`; // Use timestamp for unique ID
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = item.task;
            
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-item-button');
            deleteButton.innerHTML = '&times;';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                li.remove();
            });
            
            checkbox.addEventListener('change', () => {
                label.classList.toggle('completed', checkbox.checked);
            });
            
            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(deleteButton);
            newEventChecklistElement.appendChild(li);
            
            newChecklistItemElement.value = '';
        }
    }
    
    // Function to add checklist item to edit event form
    function addEditEventChecklistItem() {
        const taskText = editChecklistItemElement.value.trim();
        if (taskText) {
            const item = { task: taskText, done: false };
            
            const li = document.createElement('li');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `edit-item-${Date.now()}`; // Use timestamp for unique ID

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = item.task;

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-item-button');
            deleteButton.innerHTML = '&times;';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                 li.remove();
            });
            
            checkbox.addEventListener('change', () => {
                label.classList.toggle('completed', checkbox.checked);
            });

            li.appendChild(checkbox);
            li.appendChild(label);
            li.appendChild(deleteButton);
            editEventChecklistElement.appendChild(li);
            
            editChecklistItemElement.value = '';
        }
    }
    
    // Add a new event
    function addEvent() {
        if (!firebase.auth().currentUser || !selectedDateString) {
            return;
        }
        
        const eventText = newEventTextElement.value.trim();
        const eventTime = newEventTimeElement.value;
        const checklist = getChecklistFromUI(newEventChecklistElement);
        
        console.log('Adding new event with checklist:', checklist);
        
        // Only save if there's content
        if (eventText || checklist.length > 0) {
            // Create new event object with unique ID
            const newEvent = {
                id: Date.now(),
                text: eventText,
                time: eventTime,
                checklist: checklist
            };
            
            console.log('New event object:', newEvent);
            
            // Initialize array if needed
            if (!notes[selectedDateString]) {
                notes[selectedDateString] = [];
            }
            
            // Add new event to array
            notes[selectedDateString].push(newEvent);
            console.log('Updated notes for date:', notes[selectedDateString]);
            
            // Save to Firebase
            saveNotesToFirebase().then(() => {
                // Reset the form
                newEventTextElement.value = '';
                newEventTimeElement.value = '';
                newEventChecklistElement.innerHTML = '';
                
                // Refresh the events list
                displayEventsInModal();
                
                // Update calendar view
                renderCalendarView();
            });
        }
    }
    
    // Show edit event section for selected event
    function handleEditEvent(event) {
        currentEditingEventId = event.id;
        
        // Fill the edit form with event data
        editEventTimeElement.value = event.time || '';
        editEventTextElement.value = event.text || '';
        renderChecklistForEditEvent(event.checklist || []);
        
        // Show edit section, hide add section
        editEventSection.style.display = 'block';
    }
    
    // Hide the edit event section
    function hideEditEventSection() {
        editEventSection.style.display = 'none';
        currentEditingEventId = null;
        editEventTimeElement.value = '';
        editEventTextElement.value = '';
        editEventChecklistElement.innerHTML = '';
    }
    
    // Save edited event
    function saveEditedEvent() {
        if (!firebase.auth().currentUser || !selectedDateString || !currentEditingEventId) {
            return;
        }
        
        const eventText = editEventTextElement.value.trim();
        const eventTime = editEventTimeElement.value;
        const checklist = getChecklistFromUI(editEventChecklistElement);
        
        console.log('Saving edited event with checklist:', checklist);
        
        // Find the event in the array
        const eventsForDay = notes[selectedDateString] || [];
        const eventIndex = eventsForDay.findIndex(e => e.id === currentEditingEventId);
        
        if (eventIndex !== -1) {
            // Update event data
            eventsForDay[eventIndex] = {
                id: currentEditingEventId,
                text: eventText,
                time: eventTime,
                checklist: checklist
            };
            
            console.log('Updated event:', eventsForDay[eventIndex]);
            
            // Save to Firebase
            saveNotesToFirebase().then(() => {
                // Hide edit section
                hideEditEventSection();
                
                // Refresh the events list
                displayEventsInModal();
                
                // Update calendar view
                renderCalendarView();
            });
        }
    }
    
    // Delete an event
    function handleDeleteEvent() {
        if (!firebase.auth().currentUser || !selectedDateString || !currentEditingEventId) {
            return;
        }
        
        // Find the event in the array
        const eventsForDay = notes[selectedDateString] || [];
        const eventIndex = eventsForDay.findIndex(e => e.id === currentEditingEventId);
        
        if (eventIndex !== -1) {
            // Remove the event from the array
            eventsForDay.splice(eventIndex, 1);
            
            // If no events left, delete the date entry
            if (eventsForDay.length === 0) {
                delete notes[selectedDateString];
            } else {
                notes[selectedDateString] = eventsForDay;
            }
            
            // Save to Firebase
            saveNotesToFirebase().then(() => {
                // Hide edit section
                hideEditEventSection();
                
                // Refresh the events list
                displayEventsInModal();
                
                // Update calendar view
                renderCalendarView();
            });
        }
    }
    
    // Save notes to Firebase
    function saveNotesToFirebase() {
        return new Promise((resolve, reject) => {
            const user = firebase.auth().currentUser;
            if (!user) {
                reject(new Error('User not logged in'));
                return;
            }
            
            db.collection('userNotes').doc(user.uid).set({ notes: notes })
                .then(() => {
                    console.log('Notes saved successfully to Firestore');
                    resolve();
                })
                .catch(error => {
                    console.error("Error saving notes:", error);
                    alert("Error saving to cloud: " + error.message);
                    reject(error);
                });
        });
    }

    // --- Event Listeners ---
    prevButton.addEventListener('click', () => {
        const isDesktop = window.innerWidth > 1200;
        if (isDesktop) {
            desktopMonthDate.setMonth(desktopMonthDate.getMonth() - 1);
        } else {
            if (currentView === 'week') {
                mobileWeekStartDate.setDate(mobileWeekStartDate.getDate() - 7);
            } else {
                mobileMonthDate.setMonth(mobileMonthDate.getMonth() - 1);
            }
        }
        renderCalendarView();
    });

    nextButton.addEventListener('click', () => {
        const isDesktop = window.innerWidth > 1200;
        if (isDesktop) {
            desktopMonthDate.setMonth(desktopMonthDate.getMonth() + 1);
        } else {
             if (currentView === 'week') {
                mobileWeekStartDate.setDate(mobileWeekStartDate.getDate() + 7);
            } else {
                mobileMonthDate.setMonth(mobileMonthDate.getMonth() + 1);
            }
        }
        renderCalendarView();
    });

    // Toggle view only affects mobile
    toggleViewButton.addEventListener('click', () => {
        currentView = (currentView === 'week') ? 'month' : 'week';
        if (currentView === 'month') {
             // When switching to month view, set month based on current week view start date
            mobileMonthDate = new Date(mobileWeekStartDate);
            mobileMonthDate.setDate(1);
        } else {
            // When switching back to week view, reset to today
             mobileWeekStartDate = new Date(); 
             mobileWeekStartDate.setHours(0, 0, 0, 0);
        }
        renderCalendarView(); // Re-render mobile view
    });

    // Modal event listeners
    closeButton.addEventListener('click', closeNoteModal);
    
    // Add new event
    addEventButton.addEventListener('click', addEvent);
    
    // Add checklist item to new event
    addItemButton.addEventListener('click', addNewEventChecklistItem);
    newChecklistItemElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addNewEventChecklistItem();
        }
    });
    
    // Add checklist item to edit event
    editAddItemButton.addEventListener('click', addEditEventChecklistItem);
    editChecklistItemElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addEditEventChecklistItem();
        }
    });
    
    // Edit event actions
    saveEditedEventButton.addEventListener('click', saveEditedEvent);
    cancelEditButton.addEventListener('click', hideEditEventSection);
    deleteEventButton.addEventListener('click', handleDeleteEvent);

    // Close modal on outside click
    window.addEventListener('click', (event) => {
        if (event.target == noteModal) {
            closeNoteModal();
        }
    });

    // Add resize listener
    window.addEventListener('resize', renderCalendarView);

    // Initial Render
    renderCalendarView();
}); 