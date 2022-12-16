import escape from 'lodash/escape';
const messagebox = document.getElementById('messagebox');
const rows = document.querySelectorAll('#messagebox div');

let display = [];

export function updateMessages(messages) {

  let now = Math.floor(0.001*Date.now())

  // clear out old messages
  display = display.filter(d => {
    return d.expiry > now
  });

  // check for new messages
  if (messages.length > 0) {
    let newMesages = [];

    messages.forEach(message => {
      newMesages.push({
        message:message,
        expiry: now + 5
      });
    });

    display = [
      ...newMesages,
      ...display
    ];

    // cut extra messages (max 5 at a time)
    display = display.slice(0, rows.length);
  }

  if (display.length === 0) {
    setMessageboxHidden(true);
    return;
  }
  else { setMessageboxHidden(false); }

  rows.forEach((row,i) => {
    if (typeof display[i]?.message === 'undefined') {
      row.innerHTML = ``
    }
    row.innerHTML = `${escape(display[i]?.message)}`
  });
  
}

export function setMessageboxHidden(hidden) {
  if (hidden) {
    messagebox.classList.add('hidden');
  } else {
    messagebox.classList.remove('hidden');
  }
}
