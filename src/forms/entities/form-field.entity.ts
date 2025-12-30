import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Form } from './form.entity';
import { FieldType } from '../../common/enums/field-type.enum';

@Entity('form_fields')
export class FormField {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Form, (form) => form.fields, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: Form;

  @Column({ name: 'form_id' })
  formId: number;

  @Column()
  label: string;

  @Column({
    type: 'varchar',
    length: 20,
  })
  type: FieldType;

  @Column({ nullable: true })
  placeholder: string;

  @Column({ default: false })
  required: boolean;

  @Column({ type: 'int', nullable: true })
  minLength: number;

  @Column({ type: 'int', nullable: true })
  maxLength: number;

  @Column({ type: 'decimal', nullable: true })
  minValue: number;

  @Column({ type: 'decimal', nullable: true })
  maxValue: number;

  @Column({ type: 'text', array: true, nullable: true })
  acceptedFileTypes: string[];

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
