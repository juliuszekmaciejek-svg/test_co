document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select options to avoid duplicates on re-fetch
      activitySelect.innerHTML = "";
      const defaultOption = document.createElement('option');
      defaultOption.value = "";
      defaultOption.textContent = "Select an activity";
      defaultOption.disabled = true;
      defaultOption.selected = true;
      activitySelect.appendChild(defaultOption);

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantsListHtml = details.participants && details.participants.length > 0
          ? `<div class="participants"><strong>Participants:</strong><ul class="participants-list">${details.participants.map(p => `<li data-email="${p}"><span class="participant-name">${p}</span> <button class="participant-remove" aria-label="Remove ${p}">×</button></li>`).join('')}</ul></div>`
          : `<div class="participants info"><em>No participants yet</em></div>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsListHtml}
        `;

        // Attach remove handlers for participant remove buttons
        const removeButtons = activityCard.querySelectorAll('.participant-remove');
        removeButtons.forEach(btn => {
          btn.addEventListener('click', async (event) => {
            event.stopPropagation();
            const li = event.target.closest('li');
            const email = li && li.dataset && li.dataset.email;
            if (!email) return;

            try {
              const response = await fetch(`/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              const result = await response.json();

              if (response.ok) {
                // update local details and UI
                const idx = details.participants.indexOf(email);
                if (idx > -1) details.participants.splice(idx, 1);
                li.remove();

                const availabilityEl = activityCard.querySelector('.availability');
                if (availabilityEl) {
                  const spots = details.max_participants - details.participants.length;
                  availabilityEl.innerHTML = `<strong>Availability:</strong> ${spots} spots left`;
                }

                const participantsDiv = activityCard.querySelector('.participants');
                if (details.participants.length === 0 && participantsDiv) {
                  participantsDiv.innerHTML = `<div class="participants info"><em>No participants yet</em></div>`;
                }
              } else {
                alert(result.detail || result.message || 'Failed to remove participant');
              }
            } catch (err) {
              console.error('Error removing participant:', err);
              alert('Failed to remove participant');
            }
          });
        });

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so UI updates immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
