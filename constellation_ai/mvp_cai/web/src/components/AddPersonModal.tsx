'use client';

import { useState } from 'react';
import { createPerson, PersonCreate, ApiError } from '@/lib/api';
import {
  Modal,
  Button,
  Input,
  Textarea,
  FormField,
} from '@/components/ui';
import { TagInput } from '@/components/TagInput';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPersonModal({
  isOpen,
  onClose,
  onSuccess,
}: AddPersonModalProps) {
  const [formData, setFormData] = useState<PersonCreate>({
    first_name: '',
    last_name: '',
    primary_email: '',
    employer: '',
    title: '',
    notes: '',
    tags: [],
  });
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      primary_email: '',
      employer: '',
      title: '',
      notes: '',
      tags: [],
    });
    setTags([]);
    setErrors({});
    setApiError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (formData.primary_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primary_email)) {
      newErrors.primary_email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      const data: PersonCreate = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        primary_email: formData.primary_email?.trim() || null,
        employer: formData.employer?.trim() || null,
        title: formData.title?.trim() || null,
        notes: formData.notes?.trim() || null,
        tags: tags.length > 0 ? tags : null,
      };

      await createPerson(data);
      handleClose();
      onSuccess();
    } catch (error) {
      if (error instanceof ApiError) {
        setApiError(error.detail);
      } else {
        setApiError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Person">
      <form onSubmit={handleSubmit}>
        {apiError && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              color: '#dc2626',
              fontSize: '14px',
            }}
          >
            {apiError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="First Name" required error={errors.first_name}>
            <Input
              value={formData.first_name}
              onChange={(value) =>
                setFormData({ ...formData, first_name: value })
              }
              placeholder="John"
              required
            />
          </FormField>

          <FormField label="Last Name" required error={errors.last_name}>
            <Input
              value={formData.last_name}
              onChange={(value) =>
                setFormData({ ...formData, last_name: value })
              }
              placeholder="Doe"
              required
            />
          </FormField>
        </div>

        <FormField label="Email" error={errors.primary_email}>
          <Input
            value={formData.primary_email || ''}
            onChange={(value) =>
              setFormData({ ...formData, primary_email: value })
            }
            placeholder="john@example.com"
            type="email"
          />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Employer">
            <Input
              value={formData.employer || ''}
              onChange={(value) =>
                setFormData({ ...formData, employer: value })
              }
              placeholder="Acme Corp"
            />
          </FormField>

          <FormField label="Title">
            <Input
              value={formData.title || ''}
              onChange={(value) => setFormData({ ...formData, title: value })}
              placeholder="Software Engineer"
            />
          </FormField>
        </div>

        <FormField label="Tags">
          <TagInput
            tags={tags}
            onChange={setTags}
            placeholder="Type a tag and press Enter"
          />
        </FormField>

        <FormField label="Notes">
          <Textarea
            value={formData.notes || ''}
            onChange={(value) => setFormData({ ...formData, notes: value })}
            placeholder="Any additional notes..."
            rows={3}
          />
        </FormField>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '24px',
          }}
        >
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Person'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
