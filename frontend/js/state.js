/**
 * CampusHub Reactive Observable Store
 * Manages client application state, optimistic UI mutations, server reconciliations,
 * role management (STUDENT / ADMIN), and admin workspace selections.
 */
import { computePercentage } from './utils.js';

class Store {
  constructor() {
    const savedRole = localStorage.getItem('campushub-role') || 'STUDENT';

    this.state = {
      currentUser: {
        id: 2, // John Doe default seed
        name: 'John Doe',
        email: 'john.doe@campus.edu',
        role: savedRole,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
      },
      activeTab: 'home',
      timetable: [],
      attendance: [],
      marketplace: [],
      lostfound: [],
      filters: {
        marketCategory: 'ALL',
        lostType: 'ALL',
        timetableDay: 'ALL',
        adminSubTab: 'claims' // 'claims' | 'market' | 'audit'
      },
      // Admin batch selections & inspection
      selectedClaimIds: new Set(),
      inspectingItemId: null,
      // Per-record in-flight locks to disable steppers and action buttons
      pendingAttendanceIds: new Set(),
      pendingClaimIds: new Set(),
      loading: {
        user: false,
        timetable: false,
        attendance: false,
        marketplace: false,
        lostfound: false
      }
    };

    this.subscribers = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  setState(partialState) {
    this.state = { ...this.state, ...partialState };
    this.notify(Object.keys(partialState));
  }

  notify(changedKeys) {
    for (const listener of this.subscribers) {
      try {
        listener(this.state, changedKeys);
      } catch (err) {
        console.error('[Store Subscriber Error]:', err);
      }
    }
  }

  // --- Role Actions ---

  toggleUserRole() {
    const newRole = this.state.currentUser.role === 'ADMIN' ? 'STUDENT' : 'ADMIN';
    this.setUserRole(newRole);
    return newRole;
  }

  setUserRole(role) {
    const updatedUser = { ...this.state.currentUser, role };
    localStorage.setItem('campushub-role', role);
    document.documentElement.setAttribute('data-role', role);

    // If switching to ADMIN on desktop, switch to admin view if requested
    let nextTab = this.state.activeTab;
    if (role === 'ADMIN' && window.innerWidth >= 1024 && this.state.activeTab === 'home') {
      nextTab = 'admin';
    } else if (role === 'STUDENT' && this.state.activeTab === 'admin') {
      nextTab = 'home';
    }

    this.setState({ currentUser: updatedUser, activeTab: nextTab });
  }

  // --- Navigation & Filter Actions ---

  setActiveTab(tabName) {
    if (this.state.activeTab !== tabName) {
      this.setState({ activeTab: tabName });
    }
  }

  setAdminSubTab(subTab) {
    this.setState({
      filters: { ...this.state.filters, adminSubTab: subTab }
    });
  }

  setCurrentUser(user) {
    const role = localStorage.getItem('campushub-role') || user.role || 'STUDENT';
    this.setState({ currentUser: { ...user, role } });
  }

  setTimetable(timetable) {
    this.setState({ timetable: timetable || [] });
  }

  addTimetableEntry(entry) {
    this.setState({ timetable: [...this.state.timetable, entry] });
  }

  setAttendance(rawAttendance) {
    const normalized = (rawAttendance || []).map((rec) => ({
      ...rec,
      percentage: computePercentage(rec.attendedClasses, rec.totalClasses)
    }));
    this.setState({ attendance: normalized });
  }

  setMarketplace(marketplace) {
    this.setState({ marketplace: marketplace || [] });
  }

  addMarketplaceItem(item) {
    this.setState({ marketplace: [item, ...this.state.marketplace] });
  }

  deleteMarketplaceItem(id) {
    this.setState({
      marketplace: this.state.marketplace.filter((m) => m.id !== id)
    });
  }

  setLostFound(lostfound) {
    this.setState({ lostfound: lostfound || [] });
  }

  addLostFoundItem(item) {
    this.setState({ lostfound: [item, ...this.state.lostfound] });
  }

  setMarketFilter(category) {
    this.setState({
      filters: { ...this.state.filters, marketCategory: category }
    });
  }

  setLostFilter(type) {
    this.setState({
      filters: { ...this.state.filters, lostType: type }
    });
  }

  setTimetableDay(day) {
    this.setState({
      filters: { ...this.state.filters, timetableDay: day }
    });
  }

  // --- Admin Batch Selection & Inspection ---

  toggleSelectClaim(id) {
    const nextSet = new Set(this.state.selectedClaimIds);
    if (nextSet.has(id)) {
      nextSet.delete(id);
    } else {
      nextSet.add(id);
    }
    this.setState({ selectedClaimIds: nextSet });
  }

  selectAllClaims(allIds) {
    this.setState({ selectedClaimIds: new Set(allIds) });
  }

  clearSelectedClaims() {
    this.setState({ selectedClaimIds: new Set() });
  }

  setInspectingItemId(id) {
    this.setState({ inspectingItemId: id });
  }

  updateClaimStatus(id, newStatus) {
    const updated = this.state.lostfound.map((item) => {
      if (item.id === id) {
        return { ...item, status: newStatus };
      }
      return item;
    });
    this.setState({ lostfound: updated });
  }

  // --- Optimistic UI Helpers ---

  optimisticStepAttendance(id, attended) {
    const previousList = [...this.state.attendance];
    const newPending = new Set(this.state.pendingAttendanceIds);
    newPending.add(id);

    const updated = this.state.attendance.map((rec) => {
      if (rec.id === id) {
        const totalClasses = rec.totalClasses + 1;
        const attendedClasses = attended ? rec.attendedClasses + 1 : rec.attendedClasses;
        return {
          ...rec,
          totalClasses,
          attendedClasses,
          percentage: computePercentage(attendedClasses, totalClasses)
        };
      }
      return rec;
    });

    this.setState({ attendance: updated, pendingAttendanceIds: newPending });

    return () => {
      const rollbackPending = new Set(this.state.pendingAttendanceIds);
      rollbackPending.delete(id);
      this.setState({ attendance: previousList, pendingAttendanceIds: rollbackPending });
    };
  }

  reconcileStepAttendance(id, serverRecord) {
    const newPending = new Set(this.state.pendingAttendanceIds);
    newPending.delete(id);

    const reconciled = this.state.attendance.map((rec) => {
      if (rec.id === id) {
        return {
          ...rec,
          totalClasses: serverRecord.totalClasses,
          attendedClasses: serverRecord.attendedClasses,
          percentage: computePercentage(serverRecord.attendedClasses, serverRecord.totalClasses)
        };
      }
      return rec;
    });

    this.setState({ attendance: reconciled, pendingAttendanceIds: newPending });
  }

  optimisticClaimItem(id) {
    const previousList = [...this.state.lostfound];
    const newPending = new Set(this.state.pendingClaimIds);
    newPending.add(id);

    const updated = this.state.lostfound.map((item) => {
      if (item.id === id) {
        return { ...item, status: 'CLAIMED' };
      }
      return item;
    });

    this.setState({ lostfound: updated, pendingClaimIds: newPending });

    return () => {
      const rollbackPending = new Set(this.state.pendingClaimIds);
      rollbackPending.delete(id);
      this.setState({ lostfound: previousList, pendingClaimIds: rollbackPending });
    };
  }

  reconcileClaimItem(id, serverItem) {
    const newPending = new Set(this.state.pendingClaimIds);
    newPending.delete(id);

    const reconciled = this.state.lostfound.map((item) => {
      if (item.id === id) {
        return { ...item, status: (serverItem && serverItem.status) || 'CLAIMED' };
      }
      return item;
    });

    this.setState({ lostfound: reconciled, pendingClaimIds: newPending });
  }
}

export const store = new Store();
