/**
 * CampusHub Reactive Observable Store
 * Manages client application state, optimistic UI mutations, server reconciliations,
 * and direct in-memory appends for modal creation actions.
 */
import { computePercentage } from './utils.js';

class Store {
  constructor() {
    this.state = {
      currentUser: {
        id: 2, // John Doe default seed
        name: 'John Doe',
        email: 'john.doe@campus.edu',
        role: 'STUDENT',
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
        timetableDay: 'TODAY'
      },
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

  /**
   * Returns current state snapshot.
   */
  getState() {
    return this.state;
  }

  /**
   * Subscribes a listener callback to state updates.
   * @param {Function} listener (state, changedKeys) => void
   * @returns {Function} Unsubscribe handle
   */
  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  /**
   * Merges partial state and notifies subscribers.
   * @param {Object} partialState
   */
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

  // --- Mutators & Actions ---

  setActiveTab(tabName) {
    if (this.state.activeTab !== tabName) {
      this.setState({ activeTab: tabName });
    }
  }

  setCurrentUser(user) {
    this.setState({ currentUser: user });
  }

  setTimetable(timetable) {
    this.setState({ timetable: timetable || [] });
  }

  /**
   * Appends newly created timetable entry directly to local state without refetch.
   * @param {Object} entry
   */
  addTimetableEntry(entry) {
    this.setState({ timetable: [...this.state.timetable, entry] });
  }

  /**
   * Normalizes attendance records so that `percentage` is ALWAYS guaranteed
   * and computed client-side.
   * @param {Array} rawAttendance
   */
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

  /**
   * Prepends newly created marketplace item directly to local state without refetch.
   * @param {Object} item
   */
  addMarketplaceItem(item) {
    this.setState({ marketplace: [item, ...this.state.marketplace] });
  }

  setLostFound(lostfound) {
    this.setState({ lostfound: lostfound || [] });
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

  // --- Optimistic UI & Server Reconciliation Helpers ---

  /**
   * Optimistically increments attendance and locks the stepper button.
   * Returns a rollback callback.
   * @param {number} id
   * @param {boolean} attended
   * @returns {Function} rollback
   */
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

  /**
   * Reconciles the optimistic attendance record with the canonical server response.
   * Clears the pending lock.
   * @param {number} id
   * @param {Object} serverRecord
   */
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

  /**
   * Optimistically marks a lost/found item as claimed and locks the claim button.
   * Returns a rollback callback.
   * @param {number} id
   * @returns {Function} rollback
   */
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

  /**
   * Reconciles the claimed item with the canonical server response.
   * @param {number} id
   * @param {Object} serverItem
   */
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
