import { Ticket, RetroColumn, RetroCard } from "@/types";

export function generateMeetingSummary(
  tickets: Ticket[],
  columns: RetroColumn[],
  cards: RetroCard[]
): string {
  const dateStr = new Date().toLocaleDateString();
  let markdown = `# Scrum Team Collab - Meeting Summary (${dateStr})\n\n`;

  // Planning Section
  if (tickets && tickets.length > 0) {
    markdown += `## 📋 Planning Estimates\n\n`;
    markdown += `| Ticket | Estimate | Status |\n`;
    markdown += `|--------|----------|--------|\n`;
    
    // Sort tickets by order
    const sortedTickets = [...tickets].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    for (const ticket of sortedTickets) {
      const estimate = ticket.estimate || "Not estimated";
      const status = ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1);
      
      let ticketName = ticket.name;
      if (ticket.link) {
        ticketName = `[${ticketName}](${ticket.link})`;
      }
      
      markdown += `| ${ticketName} | ${estimate} | ${status} |\n`;
    }
    markdown += `\n`;
  }

  // Retro Section
  if (columns && columns.length > 0 && cards && cards.length > 0) {
    markdown += `## 🎯 Retrospective\n\n`;
    
    // Sort columns by order
    const sortedColumns = [...columns].sort((a, b) => a.order - b.order);
    
    for (const column of sortedColumns) {
      const colCards = cards.filter(c => c.columnId === column.id);
      
      if (colCards.length > 0) {
        markdown += `### ${column.title}\n\n`;
        
        // Sort cards by upvotes (descending)
        const sortedCards = [...colCards].sort((a, b) => b.upvotes.length - a.upvotes.length);
        
        for (const card of sortedCards) {
          const upvotes = card.upvotes.length > 0 ? ` (👍 ${card.upvotes.length})` : "";
          const author = card.authorName ? ` - *${card.authorName}*` : "";
          
          markdown += `- ${card.text}${upvotes}${author}\n`;
          if (card.imageUrl) {
            markdown += `  - 🖼️ [Attached Image](${card.imageUrl})\n`;
          }
        }
        markdown += `\n`;
      }
    }
  }

  // If both empty
  if ((!tickets || tickets.length === 0) && (!cards || cards.length === 0)) {
    markdown += `*No planning estimates or retro cards were added during this meeting.*\n`;
  }

  return markdown;
}
