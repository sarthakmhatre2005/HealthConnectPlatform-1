// HealthConnect Notifications JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mark as read functionality
    const markReadButtons = document.querySelectorAll('.mark-read-btn');
    markReadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const notificationId = this.dataset.notificationId;
            
            // Show loading state
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Marking...';
            this.disabled = true;
            
            // Send AJAX request to mark as read
            fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notification_id: notificationId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update UI
                    const notificationItem = this.closest('.notification-item');
                    notificationItem.classList.remove('unread');
                    
                    // Remove "New" badge
                    const badge = notificationItem.querySelector('.badge.bg-primary');
                    if (badge) badge.remove();
                    
                    // Update button
                    this.innerHTML = '<i class="fas fa-check me-1"></i> Marked as Read';
                    this.disabled = true;
                    
                    // Show success message
                    showToast('Notification marked as read', 'success');
                } else {
                    // Show error message
                    showToast('Failed to mark notification as read', 'danger');
                    
                    // Reset button
                    this.innerHTML = '<i class="fas fa-check me-1"></i> Mark as Read';
                    this.disabled = false;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('An error occurred. Please try again.', 'danger');
                
                // Reset button
                this.innerHTML = '<i class="fas fa-check me-1"></i> Mark as Read';
                this.disabled = false;
            });
        });
    });
    
    // Delete notification functionality
    const deleteButtons = document.querySelectorAll('.delete-notification-btn');
    const deleteModal = new bootstrap.Modal(document.getElementById('delete-notification-modal'));
    const confirmDeleteButton = document.getElementById('confirm-delete-notification');
    let currentNotificationId = null;
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            currentNotificationId = this.dataset.notificationId;
            deleteModal.show();
        });
    });
    
    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener('click', function() {
            if (!currentNotificationId) return;
            
            // Show loading state
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...';
            this.disabled = true;
            
            // Send AJAX request to delete notification
            fetch('/api/notifications/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notification_id: currentNotificationId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Hide modal
                    deleteModal.hide();
                    
                    // Remove notification from UI
                    const notificationItem = document.querySelector(`.delete-notification-btn[data-notification-id="${currentNotificationId}"]`).closest('.notification-item');
                    notificationItem.style.height = notificationItem.offsetHeight + 'px';
                    notificationItem.style.opacity = '1';
                    
                    // Animate removal
                    setTimeout(() => {
                        notificationItem.style.overflow = 'hidden';
                        notificationItem.style.opacity = '0';
                        notificationItem.style.height = '0px';
                        notificationItem.style.paddingTop = '0';
                        notificationItem.style.paddingBottom = '0';
                        notificationItem.style.marginTop = '0';
                        notificationItem.style.marginBottom = '0';
                        notificationItem.style.border = 'none';
                        
                        setTimeout(() => {
                            notificationItem.remove();
                            
                            // Check if there are any notifications left
                            const remainingNotifications = document.querySelectorAll('.notification-item');
                            if (remainingNotifications.length === 0) {
                                const listGroup = document.querySelector('.list-group');
                                if (listGroup) {
                                    listGroup.innerHTML = `
                                        <div class="text-center py-5">
                                            <i class="fas fa-bell-slash fa-3x text-muted mb-3"></i>
                                            <h5>No notifications</h5>
                                            <p>You don't have any notifications at the moment.</p>
                                        </div>
                                    `;
                                }
                                
                                // Disable buttons
                                document.getElementById('mark-all-read').disabled = true;
                                document.getElementById('clear-notifications').disabled = true;
                            }
                        }, 500);
                    }, 10);
                    
                    // Show success message
                    showToast('Notification deleted successfully', 'success');
                } else {
                    // Hide modal
                    deleteModal.hide();
                    
                    // Show error message
                    showToast('Failed to delete notification', 'danger');
                }
                
                // Reset button
                this.innerHTML = 'Delete';
                this.disabled = false;
            })
            .catch(error => {
                console.error('Error:', error);
                
                // Hide modal
                deleteModal.hide();
                
                // Show error message
                showToast('An error occurred. Please try again.', 'danger');
                
                // Reset button
                this.innerHTML = 'Delete';
                this.disabled = false;
            });
        });
    }
    
    // Mark all as read functionality
    const markAllButton = document.getElementById('mark-all-read');
    if (markAllButton) {
        markAllButton.addEventListener('click', function() {
            // Show loading state
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            this.disabled = true;
            
            // Send AJAX request to mark all as read
            fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update UI
                    const unreadNotifications = document.querySelectorAll('.notification-item.unread');
                    unreadNotifications.forEach(item => {
                        // Remove unread class
                        item.classList.remove('unread');
                        
                        // Remove "New" badge
                        const badge = item.querySelector('.badge.bg-primary');
                        if (badge) badge.remove();
                        
                        // Disable mark read button
                        const markReadBtn = item.querySelector('.mark-read-btn');
                        if (markReadBtn) {
                            markReadBtn.innerHTML = '<i class="fas fa-check me-1"></i> Marked as Read';
                            markReadBtn.disabled = true;
                        }
                    });
                    
                    // Show success message
                    showToast('All notifications marked as read', 'success');
                    
                    // Disable mark all read button
                    this.disabled = true;
                } else {
                    // Show error message
                    showToast('Failed to mark all notifications as read', 'danger');
                }
                
                // Reset button
                this.innerHTML = '<i class="fas fa-check-double me-2"></i>Mark All as Read';
            })
            .catch(error => {
                console.error('Error:', error);
                
                // Show error message
                showToast('An error occurred. Please try again.', 'danger');
                
                // Reset button
                this.innerHTML = '<i class="fas fa-check-double me-2"></i>Mark All as Read';
                this.disabled = false;
            });
        });
    }
    
    // Clear all notifications functionality
    const clearAllButton = document.getElementById('clear-notifications');
    const clearAllModal = new bootstrap.Modal(document.getElementById('clear-all-modal'));
    const confirmClearAllButton = document.getElementById('confirm-clear-all');
    
    if (clearAllButton) {
        clearAllButton.addEventListener('click', function() {
            clearAllModal.show();
        });
    }
    
    if (confirmClearAllButton) {
        confirmClearAllButton.addEventListener('click', function() {
            // Show loading state
            this.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Clearing...';
            this.disabled = true;
            
            // Send AJAX request to clear all notifications
            fetch('/api/notifications/clear-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Hide modal
                    clearAllModal.hide();
                    
                    // Update UI - replace notifications with empty message
                    const notificationsContainer = document.querySelector('.card-body');
                    if (notificationsContainer) {
                        notificationsContainer.innerHTML = `
                            <div class="text-center py-5">
                                <i class="fas fa-bell-slash fa-3x text-muted mb-3"></i>
                                <h5>No notifications</h5>
                                <p>You don't have any notifications at the moment.</p>
                            </div>
                        `;
                    }
                    
                    // Disable buttons
                    document.getElementById('mark-all-read').disabled = true;
                    document.getElementById('clear-notifications').disabled = true;
                    
                    // Show success message
                    showToast('All notifications cleared successfully', 'success');
                } else {
                    // Hide modal
                    clearAllModal.hide();
                    
                    // Show error message
                    showToast('Failed to clear notifications', 'danger');
                }
                
                // Reset button
                this.innerHTML = 'Clear All';
                this.disabled = false;
            })
            .catch(error => {
                console.error('Error:', error);
                
                // Hide modal
                clearAllModal.hide();
                
                // Show error message
                showToast('An error occurred. Please try again.', 'danger');
                
                // Reset button
                this.innerHTML = 'Clear All';
                this.disabled = false;
            });
        });
    }
});