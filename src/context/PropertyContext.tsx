'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  PropertyItem, 
  DisputeRecord, 
  FieldVerificationRequest, 
  PlatformNotification, 
  ActivityLogItem, 
  VerificationStatus,
  DisputeStatus
} from '@/types';
import { 
  MOCK_PROPERTIES, 
  MOCK_DISPUTES, 
  MOCK_FIELD_REQUESTS, 
  MOCK_NOTIFICATIONS, 
  MOCK_ACTIVITY_LOGS 
} from '@/data/mockProperties';

interface PropertyContextType {
  properties: PropertyItem[];
  disputes: DisputeRecord[];
  fieldRequests: FieldVerificationRequest[];
  notifications: PlatformNotification[];
  activityLogs: ActivityLogItem[];
  getPropertyByUlpinOrId: (identifier: string) => PropertyItem | undefined;
  addDispute: (dispute: Omit<DisputeRecord, 'id' | 'disputeTicketNumber' | 'createdAt' | 'updatedAt' | 'status'>) => DisputeRecord;
  updateDisputeStatus: (disputeId: string, status: DisputeStatus, notes?: string) => void;
  addFieldRequest: (request: Omit<FieldVerificationRequest, 'id' | 'requestNumber' | 'createdAt' | 'status'>) => FieldVerificationRequest;
  updatePropertyVerificationStatus: (propertyId: string, status: VerificationStatus, note?: string, officerName?: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  unreadNotificationsCount: number;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState<PropertyItem[]>(MOCK_PROPERTIES);
  const [disputes, setDisputes] = useState<DisputeRecord[]>(MOCK_DISPUTES);
  const [fieldRequests, setFieldRequests] = useState<FieldVerificationRequest[]>(MOCK_FIELD_REQUESTS);
  const [notifications, setNotifications] = useState<PlatformNotification[]>(MOCK_NOTIFICATIONS);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(MOCK_ACTIVITY_LOGS);

  // Initialize from LocalStorage if available
  useEffect(() => {
    try {
      const savedProps = localStorage.getItem('spv_properties_data');
      if (savedProps) setProperties(JSON.parse(savedProps));
      
      const savedDisputes = localStorage.getItem('spv_disputes_data');
      if (savedDisputes) setDisputes(JSON.parse(savedDisputes));
      
      const savedRequests = localStorage.getItem('spv_field_requests');
      if (savedRequests) setFieldRequests(JSON.parse(savedRequests));
      
      const savedNotifs = localStorage.getItem('spv_notifications');
      if (savedNotifs) setNotifications(JSON.parse(savedNotifs));
    } catch (e) {
      console.warn('Could not parse localStorage state:', e);
    }
  }, []);

  const saveToStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Storage save error', e);
    }
  };

  const getPropertyByUlpinOrId = (identifier: string): PropertyItem | undefined => {
    const clean = identifier.trim().toLowerCase();
    return properties.find(
      (p) =>
        p.id.toLowerCase() === clean ||
        p.ulpin.toLowerCase() === clean ||
        p.propertyId.toLowerCase() === clean ||
        p.landDetails.surveyNumber.toLowerCase() === clean
    );
  };

  const addDispute = (
    data: Omit<DisputeRecord, 'id' | 'disputeTicketNumber' | 'createdAt' | 'updatedAt' | 'status'>
  ): DisputeRecord => {
    const randomTicketNum = Math.floor(1000 + Math.random() * 9000);
    const newDispute: DisputeRecord = {
      ...data,
      id: `dsp-${Date.now()}`,
      disputeTicketNumber: `DSP-2024-${randomTicketNum}`,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newDispute, ...disputes];
    setDisputes(updated);
    saveToStorage('spv_disputes_data', updated);

    // Update the property's dispute state
    const propUpdated = properties.map((p) => {
      if (p.id === data.propertyId || p.ulpin === data.ulpin) {
        return {
          ...p,
          hasActiveDispute: true,
          verificationStatus: 'DISPUTED' as VerificationStatus,
          disputeId: newDispute.id,
        };
      }
      return p;
    });
    setProperties(propUpdated);
    saveToStorage('spv_properties_data', propUpdated);

    // Create Notification
    const newNotif: PlatformNotification = {
      id: `notif-${Date.now()}`,
      recipientRole: 'OFFICER',
      title: 'New Dispute Case Filed',
      message: `Dispute ticket ${newDispute.disputeTicketNumber} raised for ULPIN: ${newDispute.ulpin} (${newDispute.title})`,
      type: 'DISPUTE',
      priority: 'HIGH',
      isRead: false,
      linkUrl: `/disputes/${newDispute.id}`,
      createdAt: 'Just now',
    };
    const updatedNotifs = [newNotif, ...notifications];
    setNotifications(updatedNotifs);
    saveToStorage('spv_notifications', updatedNotifs);

    // Record Activity
    const newLog: ActivityLogItem = {
      id: `act-${Date.now()}`,
      action: 'DISPUTE_RAISED',
      actorName: data.raisedByUserName,
      actorRole: 'CITIZEN',
      targetEntity: 'Dispute',
      targetId: newDispute.disputeTicketNumber,
      details: data.title,
      ipAddressMasked: '106.51.78.XXX',
      timestamp: 'Just now',
    };
    setActivityLogs([newLog, ...activityLogs]);

    return newDispute;
  };

  const updateDisputeStatus = (disputeId: string, status: DisputeStatus, notes?: string) => {
    const updated = disputes.map((d) => {
      if (d.id === disputeId) {
        return {
          ...d,
          status,
          officerInspectionNotes: notes || d.officerInspectionNotes,
          updatedAt: new Date().toISOString(),
        };
      }
      return d;
    });
    setDisputes(updated);
    saveToStorage('spv_disputes_data', updated);

    // If resolved, update property status
    if (status === 'RESOLVED') {
      const targetDispute = disputes.find((d) => d.id === disputeId);
      if (targetDispute) {
        const propUpdated = properties.map((p) => {
          if (p.id === targetDispute.propertyId || p.ulpin === targetDispute.ulpin) {
            return {
              ...p,
              hasActiveDispute: false,
              verificationStatus: 'VERIFIED' as VerificationStatus,
            };
          }
          return p;
        });
        setProperties(propUpdated);
        saveToStorage('spv_properties_data', propUpdated);
      }
    }
  };

  const addFieldRequest = (
    data: Omit<FieldVerificationRequest, 'id' | 'requestNumber' | 'createdAt' | 'status'>
  ): FieldVerificationRequest => {
    const randomReqNum = Math.floor(1000 + Math.random() * 9000);
    const newReq: FieldVerificationRequest = {
      ...data,
      id: `fvr-${Date.now()}`,
      requestNumber: `FVR-2024-${randomReqNum}`,
      status: 'PENDING_ASSIGNMENT',
      createdAt: new Date().toISOString(),
    };

    const updated = [newReq, ...fieldRequests];
    setFieldRequests(updated);
    saveToStorage('spv_field_requests', updated);

    // Update Property Status
    const propUpdated = properties.map((p) => {
      if (p.id === data.propertyId || p.ulpin === data.ulpin) {
        return {
          ...p,
          verificationStatus: 'FIELD_VERIFICATION_REQUESTED' as VerificationStatus,
        };
      }
      return p;
    });
    setProperties(propUpdated);
    saveToStorage('spv_properties_data', propUpdated);

    // Notification
    const newNotif: PlatformNotification = {
      id: `notif-${Date.now()}`,
      recipientRole: 'OFFICER',
      title: 'Field Survey Request Received',
      message: `Field verification application ${newReq.requestNumber} logged for property ${newReq.propertyTitle}.`,
      type: 'FIELD_INSPECTION',
      priority: 'MEDIUM',
      isRead: false,
      linkUrl: `/dashboard/officer`,
      createdAt: 'Just now',
    };
    const updatedNotifs = [newNotif, ...notifications];
    setNotifications(updatedNotifs);
    saveToStorage('spv_notifications', updatedNotifs);

    return newReq;
  };

  const updatePropertyVerificationStatus = (
    propertyId: string,
    status: VerificationStatus,
    note?: string,
    officerName?: string
  ) => {
    const propUpdated = properties.map((p) => {
      if (p.id === propertyId || p.ulpin === propertyId) {
        const newEvent = {
          id: `vh-${Date.now()}`,
          stage: status,
          title: `Status updated to ${status.replace(/_/g, ' ')}`,
          description: note || `Government revenue officer updated cadastral verification status.`,
          timestamp: 'Just now',
          actorName: officerName || 'Dr. Ananya Iyer, IAS',
          actorRole: 'OFFICER' as const,
        };
        return {
          ...p,
          verificationStatus: status,
          hasActiveDispute: status === 'DISPUTED',
          verificationHistory: [newEvent, ...p.verificationHistory],
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    setProperties(propUpdated);
    saveToStorage('spv_properties_data', propUpdated);

    // Notification
    const targetProp = properties.find((p) => p.id === propertyId || p.ulpin === propertyId);
    if (targetProp) {
      const newNotif: PlatformNotification = {
        id: `notif-${Date.now()}`,
        recipientRole: 'CITIZEN',
        title: `Property Status: ${status.replace(/_/g, ' ')}`,
        message: `Cadastral record for ${targetProp.title} (ULPIN: ${targetProp.ulpin}) has transitioned to ${status}.`,
        type: 'VERIFICATION',
        priority: status === 'VERIFIED' ? 'HIGH' : 'MEDIUM',
        isRead: false,
        linkUrl: `/properties/${targetProp.id}`,
        createdAt: 'Just now',
      };
      setNotifications([newNotif, ...notifications]);
    }
  };

  const markNotificationAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    saveToStorage('spv_notifications', updated);
  };

  const markAllNotificationsAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
    saveToStorage('spv_notifications', updated);
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <PropertyContext.Provider
      value={{
        properties,
        disputes,
        fieldRequests,
        notifications,
        activityLogs,
        getPropertyByUlpinOrId,
        addDispute,
        updateDisputeStatus,
        addFieldRequest,
        updatePropertyVerificationStatus,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        unreadNotificationsCount,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};
