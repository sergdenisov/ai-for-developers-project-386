import { Alert, Button, NativeSelect, Stack, Textarea, TextInput } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  createEventTypeMutation,
  listEventTypesQueryKey,
} from '../api/generated/@tanstack/react-query.gen.ts';
import type { CreateEventTypeError, WorkingHours } from '../api/generated/index.ts';
import { durationsWithin, formatDuration } from '../duration.ts';

type Values = { name: string; description: string; durationMinutes: string; id: string };

const required = 'Обязательное поле';

/** Fallback for errors that bring no message from the server, such as a lost connection. */
const unexpected = 'Что-то пошло не так, попробуйте ещё раз';

/**
 * The Owner's form for a new Event Type. Only required fields are checked here; the server checks the other rules
 * and its messages are shown as they are, next to their fields.
 */
export function CreateEventTypeForm({ workingHours }: { workingHours: WorkingHours }) {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<Values>({
    initialValues: { name: '', description: '', durationMinutes: '', id: '' },
    validate: { name: isNotEmpty(required), durationMinutes: isNotEmpty(required) },
  });

  const create = useMutation({
    ...createEventTypeMutation(),
    onSuccess: async (eventType) => {
      form.reset();
      notifications.show({ color: 'green', message: `Тип события «${eventType.name}» создан` });
      await queryClient.invalidateQueries({ queryKey: listEventTypesQueryKey() });
    },
    onError: (error) => {
      // Without a response (a lost connection) the error is not in the contract shape.
      const { code, message, fields }: Partial<CreateEventTypeError> = error;
      // Conflicts concern one field, so they are shown next to it like any other field error.
      if (code === 'EVENT_TYPE_ID_TAKEN') {
        form.setFieldError('id', message);
      } else if (code === 'EVENT_TYPE_NAME_TAKEN') {
        form.setFieldError('name', message);
      } else if (fields !== undefined) {
        form.setErrors(fields);
      } else {
        setFormError(message ?? unexpected);
      }
    },
  });

  const submit = form.onSubmit(({ name, description, durationMinutes, id }) => {
    setFormError(null);
    create.mutate({
      body: {
        name,
        // The server treats a blank description as none and assigns an id when there is none.
        description: description === '' ? undefined : description,
        durationMinutes: Number(durationMinutes),
        id: id === '' ? undefined : id,
      },
    });
  });

  const durations = durationsWithin(workingHours).map((minutes) => ({
    value: String(minutes),
    label: formatDuration(minutes),
  }));

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md" maw={480}>
        <TextInput label="Название" withAsterisk {...form.getInputProps('name')} />
        <Textarea label="Описание" rows={3} {...form.getInputProps('description')} />
        <NativeSelect
          label="Длительность"
          withAsterisk
          data={[{ value: '', label: 'Выберите длительность', disabled: true }, ...durations]}
          {...form.getInputProps('durationMinutes')}
        />
        <TextInput
          label="Идентификатор"
          description="Часть ссылки на запись, например intro-call. Если не указать, назначится автоматически"
          {...form.getInputProps('id')}
        />
        {formError !== null && <Alert color="red">{formError}</Alert>}
        <Button type="submit" loading={create.isPending} style={{ alignSelf: 'flex-start' }}>
          Создать
        </Button>
      </Stack>
    </form>
  );
}
