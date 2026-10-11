import React from 'react';
import { UserRound, Save } from 'lucide-react';
import { apiPost } from '../api/client.js';
import { getErrorMessage } from '../presenters/format.presenter.js';
import {
  Banner,
  Box,
  Button,
  ErrorMessage,
  Field,
  Page,
  PageHeader,
  Panel,
  Text,
  TextInput,
} from '../components/ui';

// FRA-56: profile page — shows the signed-in user's email (read-only) and
// lets them edit the first/last name collected at signup.
export function Profile({ token, user, onSaved }) {
  const [firstName, setFirstName] = React.useState(user?.first_name || '');
  const [lastName, setLastName] = React.useState(user?.last_name || '');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  async function save(event) {
    event.preventDefault();
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      setError('Please enter your first and last name.');
      return;
    }
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const payload = await apiPost('/api/me/profile', { first_name: first, last_name: last }, token);
      setFirstName(payload.user.first_name || '');
      setLastName(payload.user.last_name || '');
      setSaved(true);
      onSaved?.(payload.user);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <PageHeader eyebrow="Account" title="Profile" lede="Your name appears in the sidebar and across the app." />
      <Panel>
        <Box className="record-list">
          <Box>
            <Text as="span">Email</Text>
            <Text as="strong">{user?.email || '—'}</Text>
          </Box>
        </Box>
        <Box as="form" onSubmit={save}>
          <Field label="First name" icon={UserRound}>
            <TextInput
              name="first_name"
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Marie"
              autoComplete="given-name"
              required
            />
          </Field>
          <Field label="Last name" icon={UserRound}>
            <TextInput
              name="last_name"
              type="text"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Curie"
              autoComplete="family-name"
              required
            />
          </Field>
          {error && <ErrorMessage message={error} />}
          {saved && !error && (
            <Banner icon={Save} title="Saved" text="Your name has been updated." />
          )}
          <Button variant="primary" type="submit" disabled={saving} icon={Save} iconSize={18}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </Box>
      </Panel>
    </Page>
  );
}
